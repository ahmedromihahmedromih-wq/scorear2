import fs from 'fs';

// 1. Update world-flow.js
let wf = fs.readFileSync('world-flow.js', 'utf8');

const oldLaunchBlock = `  function launchRoomNow() {
    closeWorldModal();
    const worldId = wizardState.worldId || activeSelectedWorldId || 'royal';
    const pin = (typeof global.currentLobbyPin === 'string' && /^\\d{6}$/.test(global.currentLobbyPin)) ? global.currentLobbyPin : String(Math.floor(100000 + Math.random() * 900000));
    global.currentLobbyPin = pin;
    if (typeof global.renderLiveLobby === 'function') {
      global.renderLiveLobby(worldId, pin, true);
    } else if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.startHostLobby === 'function') {
      global.ScoreARQuizHost.startHostLobby(worldId, pin, true);
    } else {
      window.location.hash = '#worlds';
    }
  }`;

const newLaunchBlock = `  function launchRoomNow() {
    closeWorldModal();
    const worldId = wizardState.worldId || activeSelectedWorldId || 'royal';
    const pin = (typeof global.currentLobbyPin === 'string' && /^\\d{6}$/.test(global.currentLobbyPin)) ? global.currentLobbyPin : String(Math.floor(100000 + Math.random() * 900000));
    global.currentLobbyPin = pin;
    if (global.ScoreARGameModes && typeof global.ScoreARGameModes.openModePicker === 'function') {
      global.ScoreARGameModes.openModePicker({
        worldId: worldId,
        pin: pin,
        onConfirm: (wId) => {
          if (typeof global.renderLiveLobby === 'function') {
            global.renderLiveLobby(wId, pin, true);
          } else if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.startHostLobby === 'function') {
            global.ScoreARQuizHost.startHostLobby(wId, pin, true);
          }
        }
      });
      return;
    }
    if (typeof global.renderLiveLobby === 'function') {
      global.renderLiveLobby(worldId, pin, true);
    } else if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.startHostLobby === 'function') {
      global.ScoreARQuizHost.startHostLobby(worldId, pin, true);
    } else {
      window.location.hash = '#worlds';
    }
  }`;

wf = wf.replace(oldLaunchBlock.replace(/\r\n/g, '\n'), newLaunchBlock.replace(/\r\n/g, '\n'));
wf = wf.replace(oldLaunchBlock, newLaunchBlock);
fs.writeFileSync('world-flow.js', wf, 'utf8');
console.log('✅ Integrated into world-flow.js');

// 2. Update quiz-host.js
let hostJs = fs.readFileSync('quiz-host.js', 'utf8');

// Inside startHostLobby after init:
const oldHostInit = `    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.init('host', pin, handleHostIncomingMessage);
      global.ScoreARRealtime.subscribe(handleHostIncomingMessage);
    }`;

const newHostInit = `    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.init('host', pin, handleHostIncomingMessage);
      global.ScoreARRealtime.subscribe(handleHostIncomingMessage);
    }
    if (global.ScoreARCardArena && typeof global.ScoreARCardArena.initArena === 'function') {
      global.ScoreARCardArena.initArena(pin, 'host', true);
    }
    if (global.ScoreARGameModes && global.ScoreARGameModes.isAIEnabled()) {
      setTimeout(() => {
        if (currentRoom && currentRoom.players && currentRoom.players.length === 0) {
          addDemoPlayer('🤖 أرجون الذكي');
          addDemoPlayer('🤖 سارة المجرة');
          addDemoPlayer('🤖 فارس الزمن');
        }
      }, 600);
    }`;

hostJs = hostJs.replace(oldHostInit.replace(/\r\n/g, '\n'), newHostInit.replace(/\r\n/g, '\n'));
hostJs = hostJs.replace(oldHostInit, newHostInit);
fs.writeFileSync('quiz-host.js', hostJs, 'utf8');
console.log('✅ Integrated into quiz-host.js');

// 3. Update quiz-student.js
let studentJs = fs.readFileSync('quiz-student.js', 'utf8');

const oldStudentInit = `      global.ScoreARRealtime.publish('STUDENT_JOIN', { player: { id: currentStudent.uid, name: currentStudent.name, avatarId: currentStudent.avatarId }, pin: currentPin });
    }`;

const newStudentInit = `      global.ScoreARRealtime.publish('STUDENT_JOIN', { player: { id: currentStudent.uid, name: currentStudent.name, avatarId: currentStudent.avatarId }, pin: currentPin });
    }
    if (global.ScoreARCardArena && typeof global.ScoreARCardArena.initArena === 'function') {
      global.ScoreARCardArena.initArena(currentPin, currentStudent.uid, false);
    }`;

studentJs = studentJs.replace(oldStudentInit.replace(/\r\n/g, '\n'), newStudentInit.replace(/\r\n/g, '\n'));
studentJs = studentJs.replace(oldStudentInit, newStudentInit);

// When question renders, mount deck:
const oldRenderQ = `    if (view()) view().renderStudentQuestion(getOrCreateStudentStage(), qData, currentWorldId, timeRemaining);`;
const newRenderQ = `    if (view()) view().renderStudentQuestion(getOrCreateStudentStage(), qData, currentWorldId, timeRemaining);
    if (global.ScoreARCardArena && typeof global.ScoreARCardArena.mountStudentDeck === 'function') {
      global.ScoreARCardArena.mountStudentDeck(getOrCreateStudentStage());
    }`;

studentJs = studentJs.replace(oldRenderQ.replace(/\r\n/g, '\n'), newRenderQ.replace(/\r\n/g, '\n'));
studentJs = studentJs.replace(oldRenderQ, newRenderQ);

// On correct answer, grant card:
const oldResultCheck = `    const isCorrect = myResult ? Boolean(myResult.isCorrect ?? myResult.correct) : false;`;
const newResultCheck = `    const isCorrect = myResult ? Boolean(myResult.isCorrect ?? myResult.correct) : false;
    if (isCorrect && global.ScoreARCardArena && typeof global.ScoreARCardArena.onCorrectAnswerGranted === 'function') {
      global.ScoreARCardArena.onCorrectAnswerGranted(currentStudent.uid);
    }`;

studentJs = studentJs.replace(oldResultCheck.replace(/\r\n/g, '\n'), newResultCheck.replace(/\r\n/g, '\n'));
studentJs = studentJs.replace(oldResultCheck, newResultCheck);

fs.writeFileSync('quiz-student.js', studentJs, 'utf8');
console.log('✅ Integrated into quiz-student.js');

// 4. Update build.js to include new files
let buildJs = fs.readFileSync('build.js', 'utf8');
if (!buildJs.includes('quiz-game-modes.js')) {
  buildJs = buildJs.replace(
    "'manifest.json',",
    "'quiz-game-modes.js', 'quiz-card-arena.js', 'CardArenaEngine.js', 'manifest.json',"
  );
  // Also copy src/ directory
  buildJs = buildJs.replace(
    "// Clean any leftover engine directories",
    `// Copy src/ directory
const srcDir = path.join(__dirname, 'src');
if (fs.existsSync(srcDir)) {
  copyDirRecursiveSync(srcDir, path.join(publicDir, 'src'));
  copyDirRecursiveSync(srcDir, path.join(distDir, 'src'));
  console.log('✅ Synchronized src/ directory to public/ and dist/');
}

// Clean any leftover engine directories`
  );
  fs.writeFileSync('build.js', buildJs, 'utf8');
  console.log('✅ Updated build.js');
}
