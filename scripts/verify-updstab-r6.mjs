#!/usr/bin/env node
// Verification harness for impl-updstab-r6 (feature/update-stability, plugin self-update hardening).
// Usage: node scripts/verify-updstab-r6.mjs [libPath]
// Covers:
//   S1  updateRepoDir resolves a symlinked install dir to the git repo (probe run under
//       node --preserve-symlinks so PKG_DIR itself is the symlink — exercises the realpathSync)
//   S2  snapshot self-update end-to-end via archive (Gitee primary), dsh unresolvable and NEVER
//       invoked — overlay replaces ONLY package.json 'files' + cordis.patch.yml; unrelated files
//       and PERSIST_DIR untouched (sentinels); '重启 DSH 生效' semantics preserved
//   S3  Gitee archive failure flips to GitHub codeload fallback (channel/note reported)
//   S4  both archive channels unreachable -> degrade to `sh -lc dsh plugin add` -> dsh still
//       not found -> manual hint ('未找到 dsh 命令')
//   S5  degrade channel runs but fails non-notFound -> combined failure error (both channels attempted)
//   S6  degrade channel succeeds -> native-add result with 降级 note
//   S7  git install on detached HEAD: graceful report, no destructive command, never bricks silently
// Mock archive server on 127.0.0.1:8614 (8610-8613 used by R1-R4).
import http from 'node:http'
import { spawn as cpSpawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'

const LIB = process.argv[2] || './lib/index.js'
const PORT = 8614
let pass = 0, fail = 0
function check(name, ok, detail) { if (ok) { pass++; console.log('  ok ' + name) } else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')) } }

// ===== temp sandbox =====
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'bi-r6-'))
const PERSIST = path.join(ROOT, 'persist')
fs.mkdirSync(path.join(PERSIST, 'data'), { recursive: true })
fs.writeFileSync(path.join(PERSIST, 'data', 'bi-dashboards.json'), '{"sentinel":true}')

function sh(cmd, cwd) {
  return new Promise((resolve) => {
    const p = cpSpawn('sh', ['-c', cmd], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    p.stdout.on('data', c => { out += c }); p.stderr.on('data', c => { err += c })
    p.on('close', code => resolve({ code, out, err }))
  })
}
const V1 = 'V1-OLD', V2 = 'V2-NEW-LIB'

// ===== git repo (tracked lib/index.js so worktree stays clean across checkouts) =====
const GIT_BASE = path.join(ROOT, 'git')
fs.mkdirSync(GIT_BASE, { recursive: true })
const REPO = path.join(GIT_BASE, 'work')
await sh('git init -q --bare origin.git && git clone -q origin.git work && cd work && git config user.email t@t && git config user.name t', GIT_BASE)
fs.writeFileSync(path.join(REPO, 'a.txt'), 'a')
fs.mkdirSync(path.join(REPO, 'lib'), { recursive: true })
fs.copyFileSync(path.resolve(LIB), path.join(REPO, 'lib', 'index.js')) // tracked lib so worktree stays clean across checkouts
fs.writeFileSync(path.join(REPO, 'package.json'), JSON.stringify({ name: 'dsh-bi-dashboards', version: '1.0.0', type: 'module', files: ['lib', 'cordis.patch.yml', 'static/vendor', 'static/scripts', 'package.json'] }))
await sh('git add a.txt lib package.json && git commit -qm one && git push -q origin master', REPO)
await sh('git clone -q origin.git w2 && cd w2 && git config user.email t@t && git config user.name t && echo b > b.txt && git add b.txt && git commit -qm two && git push -q origin master && cd ../work && git fetch -q origin && git merge -q --ff-only origin/master', GIT_BASE)
fs.rmSync(path.join(GIT_BASE, 'w2'), { recursive: true, force: true })
// REPO: on master, clean, behind origin/master by 1, tracks lib/index.js

// ===== snapshot install dir =====
const INSTALL = path.join(ROOT, 'install')
fs.mkdirSync(path.join(INSTALL, 'lib'), { recursive: true })
fs.mkdirSync(path.join(INSTALL, 'static', 'vendor'), { recursive: true })
fs.mkdirSync(path.join(INSTALL, 'static', 'scripts'), { recursive: true })
fs.mkdirSync(path.join(INSTALL, 'data'), { recursive: true })
fs.writeFileSync(path.join(INSTALL, 'lib', 'index.js'), V1)
fs.writeFileSync(path.join(INSTALL, 'package.json'), JSON.stringify({ name: 'dsh-bi-dashboards', version: '1.0.0', files: ['lib', 'cordis.patch.yml', 'static/vendor', 'static/scripts', 'package.json'] }, null, 2))
fs.writeFileSync(path.join(INSTALL, 'cordis.patch.yml'), V1)
fs.writeFileSync(path.join(INSTALL, 'static', 'vendor', 'echarts.min.js'), V1)
fs.writeFileSync(path.join(INSTALL, 'static', 'vendor', 'keep.txt'), 'KEEP-UNRELATED')
fs.writeFileSync(path.join(INSTALL, 'static', 'scripts', 'old.py'), V1)
fs.writeFileSync(path.join(INSTALL, 'unrelated.txt'), 'KEEP-ME')
fs.writeFileSync(path.join(INSTALL, 'data', 'user.json'), '{"keep":true}')

// ===== archive payload (what the "remote repo" ships) =====
const SRC = path.join(ROOT, 'archive-src')
for (const d of ['lib', 'static/vendor', 'static/scripts', 'docs']) fs.mkdirSync(path.join(SRC, d), { recursive: true })
fs.writeFileSync(path.join(SRC, 'lib', 'index.js'), V2)
fs.writeFileSync(path.join(SRC, 'package.json'), JSON.stringify({ name: 'dsh-bi-dashboards', version: '9.9.9', files: ['lib', 'cordis.patch.yml', 'static/vendor', 'static/scripts', 'package.json'] }, null, 2))
fs.writeFileSync(path.join(SRC, 'cordis.patch.yml'), V2)
fs.writeFileSync(path.join(SRC, 'static', 'vendor', 'echarts.min.js'), V2)
fs.writeFileSync(path.join(SRC, 'static', 'scripts', 'x.py'), V2)
fs.writeFileSync(path.join(SRC, 'docs', 'rogue.md'), 'MUST-NOT-LAND')
fs.writeFileSync(path.join(SRC, 'rogue-top.txt'), 'MUST-NOT-LAND')
const ARCHIVE = path.join(ROOT, 'repo.tar.gz')
await sh('tar -czf ' + ARCHIVE + ' -C ' + SRC + ' .')

// ===== mock archive server =====
let giteeMode = 'ok', githubMode = 'ok' // 'ok' | 'fail'
const server = http.createServer((req, res) => {
  if (req.url === '/arch/gitee.tar.gz') {
    if (giteeMode !== 'ok') { res.writeHead(503); res.end('gitee down'); return }
    res.writeHead(200, { 'Content-Type': 'application/gzip' }); fs.createReadStream(ARCHIVE).pipe(res); return
  }
  if (req.url === '/arch/github.tar.gz') { if (githubMode !== 'ok') { res.writeHead(503); res.end('github down'); return } res.writeHead(200, { 'Content-Type': 'application/gzip' }); fs.createReadStream(ARCHIVE).pipe(res); return }
  res.writeHead(404); res.end()
})
await new Promise(ok => server.listen(PORT, '127.0.0.1', ok))

// ===== env hooks BEFORE lib import =====
process.env.BI_UPD_ARCHIVE_GITEE = 'http://127.0.0.1:' + PORT + '/arch/gitee.tar.gz'
process.env.BI_UPD_ARCHIVE_GITHUB = 'http://127.0.0.1:' + PORT + '/arch/github.tar.gz'
process.env.BI_DASHBOARDS_HOME = PERSIST

// fake ctx: subprocess runs REAL commands (tar/git), records argv; 'dsh' stubbed missing, 'sh' controllable
const argvLog = []
let shBehavior = null // null = run real sh; or fn(cmdStr) -> {code, err, out}
const fakeSub = {
  spawn({ argv, cwd }) {
    argvLog.push(argv.join(' '))
    let stdoutText = '', stderrText = '', resolveDone
    const done = new Promise(r => { resolveDone = r })
    const handle = { done, collected: { stdout: { readFrom() { return { text: stdoutText } } }, stderr: { readFrom() { return { text: stderrText } } } } }
    if (argv[0] === 'dsh') { resolveDone({ exitCode: 127 }); return handle }
    if (argv[0] === 'sh' && shBehavior) {
      const r = shBehavior(argv[1] || '')
      stdoutText = r.out || ''; stderrText = r.err || ''
      resolveDone({ exitCode: r.code }); return handle
    }
    const p = cpSpawn(argv[0], argv.slice(1), { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    p.stdout.on('data', c => { stdoutText += c }); p.stderr.on('data', c => { stderrText += c })
    p.on('error', e => { stderrText += String(e); resolveDone({ exitCode: 127 }) })
    p.on('close', code => resolveDone({ exitCode: code }))
    return handle
  }
}
const ctx = { get(k) { return k === 'subprocess' ? fakeSub : null } }

// main lib instance lives INSIDE the snapshot install dir so PKG_DIR === INSTALL
fs.copyFileSync(path.resolve(LIB), path.join(INSTALL, 'lib', 'index.js'))
const lib = await import(pathToFileURL(path.join(INSTALL, 'lib', 'index.js')).href)

// ===== S1 symlinked git install: updateRepoDir resolves realpath =====
{
  // probe lib loaded from UNDER a symlink with --preserve-symlinks, so PKG_DIR itself is the
  // symlink path and only updateRepoDir's realpathSync can discover the git repo
  const link = path.join(ROOT, 'link-install')
  fs.symlinkSync(REPO, link, 'dir')
  const probe = path.join(ROOT, 'probe.mjs')
  fs.writeFileSync(probe, 'const lib = await import(process.argv[2]); console.log(JSON.stringify(lib.updateRepoDir()))\n')
  const p = cpSpawn(process.execPath, ['--preserve-symlinks', probe, pathToFileURL(path.join(link, 'lib', 'index.js')).href], { stdio: ['ignore', 'pipe', 'pipe'] })
  let out = '', err = ''
  p.stdout.on('data', c => { out += c }); p.stderr.on('data', c => { err += c })
  const code = await new Promise(r => p.on('close', r))
  let res = null
  try { res = JSON.parse(out.trim()) } catch (e) {}
  check('S1 probe ran (lib importable via symlink)', code === 0, err.slice(0, 200))
  check('S1 symlink resolved to realpath git repo', res === fs.realpathSync(REPO), String(res))
  check('S1 git install detected through symlink (not null)', !!res, String(res))
  // control: direct (non-preserve-symlinks) import from the repo itself also detects git install
  const libRepo = await import(pathToFileURL(path.join(REPO, 'lib', 'index.js')).href)
  check('S1 control: direct repo import detects git install', libRepo.updateRepoDir() === fs.realpathSync(REPO), String(libRepo.updateRepoDir()))
}

// ===== S2 archive overlay end-to-end (dsh never invoked) =====
{
  giteeMode = 'ok'; argvLog.length = 0
  const r = await lib.performUpdate(ctx)
  check('S2 ok:true archive-overlay Gitee', r && r.ok === true && r.method === 'archive-overlay' && r.channel === 'Gitee', JSON.stringify(r))
  check('S2 note keeps 重启 DSH 生效 semantics', !!(r && r.note && r.note.indexOf('重启 DSH 生效') === 0), JSON.stringify(r && r.note))
  check('S2 lib/index.js replaced', fs.readFileSync(path.join(INSTALL, 'lib', 'index.js'), 'utf8') === V2, '')
  check('S2 cordis.patch.yml replaced', fs.readFileSync(path.join(INSTALL, 'cordis.patch.yml'), 'utf8') === V2, '')
  check('S2 package.json replaced (v9.9.9)', JSON.parse(fs.readFileSync(path.join(INSTALL, 'package.json'), 'utf8')).version === '9.9.9', '')
  check('S2 static/scripts/x.py landed', fs.readFileSync(path.join(INSTALL, 'static', 'scripts', 'x.py'), 'utf8') === V2, '')
  check('S2 static/vendor/echarts.min.js replaced', fs.readFileSync(path.join(INSTALL, 'static', 'vendor', 'echarts.min.js'), 'utf8') === V2, '')
  check('S2 unrelated.txt untouched', fs.readFileSync(path.join(INSTALL, 'unrelated.txt'), 'utf8') === 'KEEP-ME', '')
  check('S2 static/vendor/keep.txt untouched', fs.readFileSync(path.join(INSTALL, 'static', 'vendor', 'keep.txt'), 'utf8') === 'KEEP-UNRELATED', '')
  check('S2 data/user.json untouched', fs.readFileSync(path.join(INSTALL, 'data', 'user.json'), 'utf8') === '{"keep":true}', '')
  check('S2 docs/rogue.md NOT copied', !fs.existsSync(path.join(INSTALL, 'docs')), '')
  check('S2 rogue-top.txt NOT copied', !fs.existsSync(path.join(INSTALL, 'rogue-top.txt')), '')
  check('S2 PERSIST_DIR sentinel untouched', fs.readFileSync(path.join(PERSIST, 'data', 'bi-dashboards.json'), 'utf8') === '{"sentinel":true}', '')
  check('S2 dsh CLI never invoked', argvLog.every(a => a.indexOf('dsh') !== 0), argvLog.join(' | '))
  check('S2 only tar spawned', argvLog.every(a => a.indexOf('tar -xzf') === 0), argvLog.join(' | '))
}

// ===== S3 Gitee fails -> GitHub fallback =====
{
  giteeMode = 'fail'; argvLog.length = 0
  fs.writeFileSync(path.join(INSTALL, 'lib', 'index.js'), V1)
  const r = await lib.performUpdate(ctx)
  check('S3 ok:true channel GitHub', r && r.ok === true && r.channel === 'GitHub', JSON.stringify(r))
  check('S3 note reports 备通道', !!(r && r.note && r.note.indexOf('备通道') >= 0), JSON.stringify(r && r.note))
  check('S3 lib/index.js replaced', fs.readFileSync(path.join(INSTALL, 'lib', 'index.js'), 'utf8') === V2, '')
  check('S3 dsh still never invoked', argvLog.every(a => a.indexOf('dsh') !== 0), argvLog.join(' | '))
}

// ===== S4 both archives fail -> sh -lc dsh fallback -> dsh not found -> manual hint =====
{
  giteeMode = 'fail'; githubMode = 'fail'; argvLog.length = 0; shBehavior = () => ({ code: 127, err: 'sh: dsh: command not found', out: '' })
  fs.writeFileSync(path.join(INSTALL, 'lib', 'index.js'), V1)
  const r = await lib.performUpdate(ctx)
  check('S4 ok:false manual hint', r && r.ok === false && r.error.indexOf('未找到 dsh 命令，请手动执行：') === 0, JSON.stringify(r))
  check('S4 error mentions archive failure', !!(r && r.error && r.error.indexOf('压缩包下载亦失败') >= 0), JSON.stringify(r && r.error))
  check('S4 install dir untouched on failure', fs.readFileSync(path.join(INSTALL, 'lib', 'index.js'), 'utf8') === V1, '')
  check('S4 fallback went through sh -lc', argvLog.some(a => a.indexOf('sh -lc dsh plugin --profile web add https://gitee.com/') === 0), argvLog.join(' | '))
}

// ===== S5 fallback runs but fails non-notFound -> combined error =====
{
  giteeMode = 'fail'; githubMode = 'fail'; shBehavior = () => ({ code: 1, err: 'fatal: unable to access', out: '' })
  const r = await lib.performUpdate(ctx)
  check('S5 ok:false combined failure error', r && r.ok === false && r.error.indexOf('自动更新失败（压缩包下载与 dsh plugin add 降级通道均已尝试）') === 0, JSON.stringify(r))
  check('S5 both channels reported', !!(r && r.error && r.error.indexOf('Gitee:') >= 0 && r.error.indexOf('GitHub:') >= 0), JSON.stringify(r && r.error))
}

// ===== S6 fallback succeeds -> native-add with degrade note =====
{
  giteeMode = 'fail'; githubMode = 'fail'; shBehavior = () => ({ code: 0, err: '', out: 'added 1 package' })
  const r = await lib.performUpdate(ctx)
  check('S6 ok:true native-add Gitee', r && r.ok === true && r.method === 'native-add' && r.channel === 'Gitee', JSON.stringify(r))
  check('S6 note reports degrade', !!(r && r.note && r.note.indexOf('降级 dsh 通道') >= 0 && r.note.indexOf('重启 DSH 生效') >= 0), JSON.stringify(r && r.note))
}

// ===== S7 detached HEAD git install: graceful report =====
{
  giteeMode = 'ok'; githubMode = 'ok'; argvLog.length = 0; shBehavior = null
  const det = await sh('git checkout -q HEAD~1', REPO) // rev checkout = detached HEAD
  const sym = await sh('git symbolic-ref --short HEAD', REPO)
  if (sym.code === 0) { console.log('  FAIL S7 setup: not detached', JSON.stringify(det), JSON.stringify(sym)); process.exit(1) }
  const libRepo = await import(pathToFileURL(path.join(REPO, 'lib', 'index.js')).href)
  const r = await libRepo.performUpdate(ctx)
  check('S7 detached HEAD reported gracefully, not bricked', r && r.ok === false && r.error.indexOf('detached HEAD') >= 0, JSON.stringify(r))
  check('S7 no destructive git command run', argvLog.every(a => !/git (reset|checkout|clean)/.test(a)), argvLog.join(' | '))
  await sh('git checkout -q master', REPO)
}

console.log('\nRESULT pass=' + pass + ' fail=' + fail)
server.close()
fs.rmSync(ROOT, { recursive: true, force: true })
process.exit(fail ? 1 : 0)
