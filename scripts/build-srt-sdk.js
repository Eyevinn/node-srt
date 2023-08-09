#!/usr/bin/env node

"use strict";

const path = require('path');
const fs = require('fs');
const jsdiff = require('diff');
const process = require('process');
const clone = require('git-clone');
const del = require('del');
const { spawnSync, execSync } = require('child_process');
const os = require('os');
const env = process.env;

const SRT_REPO = env.NODE_SRT_REPO || "https://github.com/Haivision/srt.git";
const SRT_CHECKOUT = "v1.4.4";

const srtRepoPath = env.NODE_SRT_LOCAL_REPO ? `file://${path.join(__dirname, env.NODE_SRT_LOCAL_REPO)}` : SRT_REPO;
const srtCheckout = env.NODE_SRT_CHECKOUT || SRT_CHECKOUT;

const depsPath = path.join(__dirname, '../', 'deps');
const srtSourcePath = path.join(depsPath, 'srt');
const buildDir = path.join(depsPath, 'build'); // FIXME: name this srt-build (in case other deps come up)
const numCpus = os.cpus().length; // NOTE: not the actual physical cores amount btw, see https://www.npmjs.com/package/physical-cpu-count

if (!fs.existsSync(depsPath)) {
  console.log('Creating dir:', depsPath);
  fs.mkdirSync(depsPath);
}

if (!fs.existsSync(srtSourcePath)) {
  console.log(`Cloning ${srtRepoPath}#${srtCheckout}`);
  clone(srtRepoPath, srtSourcePath, { checkout: srtCheckout }, (err) => {

    if (err) {
      console.error(err.message);
      if (fs.existsSync(srtSourcePath)) del.sync(srtSourcePath);
      process.exit(1);
    }
    console.log("Patch build script");

    // Read the source file and the patch file
    const sourceFilePath = path.join(srtSourcePath, 'configure-data.tcl');
    const patchFilePath = path.join(__dirname, 'configure-data.tcl.patch');

    // Read the source file and the patch file
    const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');
    const patchContent = fs.readFileSync(patchFilePath, 'utf8');

    // Apply the patch
    const patchedContent = jsdiff.applyPatch(sourceContent, patchContent);

    // Write the patched content back to the source file
    fs.writeFileSync(sourceFilePath, patchedContent, 'utf8');

    build();
  });
} else {
  build();
}

function build() {
  console.log('Building SRT SDK and prerequisites for current platform:', process.platform);
  let opensslRoot;
  switch (process.platform) {
  case "win32":
    buildWin32();
    break;
  case "darwin":
    opensslRoot = execSync('brew --prefix openssl').toString().trim();
    process.env.OPENSSL_ROOT_DIR = opensslRoot;
    buildNx();
    break;
  default:
    buildNx();
  }
}

function buildWin32() {
  process.env.SRT_ROOT = srtSourcePath;
  fs.mkdirSync(buildDir);

  console.log("Building OpenSSL");
  const openssl = spawnSync('vcpkg', [ 'install', 'openssl', '--triplet', `${process.arch}-windows` ], { cwd: process.env.VCPKG_ROOT, shell: true } );
  if (openssl.stdout)
    console.log(openssl.stdout.toString());
  if (openssl.status) {
    console.log(openssl.stderr.toString());
    process.exit(openssl.status);
  }

  console.log("Building pthreads");
  const pthreads = spawnSync('vcpkg', [ 'install', 'pthreads', '--triplet', `${process.arch}-windows` ], { cwd: process.env.VCPKG_ROOT, shell: true } );
  if (pthreads.stdout)
    console.log(pthreads.stdout.toString());
  if (pthreads.status) {
    console.log(pthreads.stderr.toString());
    process.exit(pthreads.status);
  }

  console.log("Integrate vcpkg build system");
  const integrate = spawnSync('vcpkg', [ 'integrate', 'install' ], { cwd: process.env.VCPKG_ROOT, shell: true } );
  if (integrate.stdout)
    console.log(integrate.stdout.toString());
  if (integrate.status) {
    console.log(integrate.stderr.toString());
    process.exit(integrate.status);
  }

  console.log("Running cmake generator");
  const generator = spawnSync('cmake', [ srtSourcePath, '-DCMAKE_BUILD_TYPE=Release', '-G"Visual Studio 16 2019"', '-A', process.arch, '-DCMAKE_TOOLCHAIN_FILE="%VCPKG_ROOT%\\scripts\\buildsystems\\vcpkg.cmake' ], { cwd: buildDir, shell: true } );
  if (generator.stdout)
    console.log(generator.stdout.toString());
  if (generator.status) {
    console.log(generator.stderr.toString());
    process.exit(generator.status);
  }

  console.log("Running CMake build");
  const build = spawnSync('cmake', [ '--build', buildDir, '--config', 'Release' ], { cwd: buildDir, shell: true } );
  if (build.stdout)
    console.log(build.stdout.toString());
  if (build.status) {
    console.log(build.stderr.toString());
    process.exit(build.status);
  }
}

function buildNx() {
  console.log("Running ./configure");
  const configure = spawnSync('./configure', [ '--prefix', buildDir ], { cwd: srtSourcePath, shell: true, stdio: 'inherit' } );
  if (configure.status) {
    process.exit(configure.status);
  }

  console.log("Running make with threads:", numCpus);
  const make = spawnSync('make', [`-j${numCpus}`], { cwd: srtSourcePath, shell: true, stdio: 'inherit' });
  if (make.status) {
    process.exit(make.status);
  }

  console.log("Running make install");
  const install = spawnSync('make', ['install'], { cwd: srtSourcePath, shell: true, stdio: 'inherit' });
  if (install.status) {
    process.exit(install.status);
  }
}
