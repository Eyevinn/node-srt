const path = require('path');
const fs = require('fs');
const clone = require('git-clone');
const { spawnSync } = require('child_process');

const SRT_REPO = "git@github.com:Haivision/srt.git";
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
  });
}