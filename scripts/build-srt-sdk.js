const path = require('path');
const fs = require('fs');
const process = require('process');
const clone = require('git-clone');
const { spawnSync } = require('child_process');

const SRT_REPO = "https://github.com/Haivision/srt.git";
const SRT_VERSION = "v1.4.1";

const depsPath = path.join(__dirname, '../', 'deps');
const srtSourcePath = path.join(depsPath, 'srt');
const buildDir = path.join(depsPath, 'build');

if (!fs.existsSync(depsPath)) {
  fs.mkdirSync(depsPath);
}
if (!fs.existsSync(buildDir)) {
  console.log(`Cloning ${SRT_REPO}:${SRT_VERSION}`);
  clone(SRT_REPO, srtSourcePath, { checkout: SRT_VERSION }, () => {
    if (process.platform === "win32") {
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

      console.log("Running cmake build");
      const build = spawnSync('cmake', [ '--build', buildDir, '--config', 'Release' ], { cwd: buildDir, shell: true } );
      if (build.stdout)
        console.log(build.stdout.toString());
      if (build.status) {
        console.log(build.stderr.toString());
        process.exit(build.status);
      }
    } else {
      console.log("Running ./configure");
      const configure = spawnSync('./configure', [ '--prefix', buildDir ], { cwd: srtSourcePath, shell: true } );
      console.log(configure.stdout.toString());
      if (configure.status) {
        console.log(configure.stderr.toString());
        process.exit(configure.status);
      }

      console.log("Running make");
      const make = spawnSync('make', [], { cwd: srtSourcePath, shell: true });
      console.log(make.stdout.toString());
      if (make.status) {
        console.log(make.stderr.toString());
        process.exit(make.status);
      }

      console.log("Running make install");
      const install = spawnSync('make', [ 'install' ], { cwd: srtSourcePath, shell: true });
      console.log(install.stdout.toString());
      if (install.status) {
        console.log(install.stderr.toString());
        process.exit(install.status);
      }
    }
  });
}