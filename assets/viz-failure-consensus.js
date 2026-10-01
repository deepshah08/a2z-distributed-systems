/* ==========================================================================
   Distributed Systems, Node by Node — Failure Detection & Consensus Foundations
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 5. Unreliable Failure Detectors & Φ-Accrual
   * -------------------------------------------------------------------------- */
  OS.register('phiFailureDetector', function (host) {
    let phiThreshold = 8; // Cassandra default: 8
    let timeSinceLastHeartbeatMs = 1200;
    let meanHeartbeatMs = 1000;
    let calculatedPhi = 1.2;
    let detectorLog = 'Heartbeat interval nominal (~1000ms). Node judged HEALTHY.';

    function updatePhi() {
      // Approximate exponential distribution tail: P_later = exp(-delta / mean)
      const ratio = timeSinceLastHeartbeatMs / meanHeartbeatMs;
      calculatedPhi = (ratio * 1.5).toFixed(2);
      const isSuspect = calculatedPhi >= phiThreshold;
      detectorLog = isSuspect
        ? `🚨 SUSPICION TRIGGERED: Φ = ${calculatedPhi} >= Threshold (${phiThreshold}) ➔ Node declared DEAD!`
        : `HEALTHY: Φ = ${calculatedPhi} < Threshold (${phiThreshold}) ➔ Latency variation within acceptable jitter.`;
      render();
    }

    const controls = OS.controls(host);
    OS.slider(controls, {
      label: 'Silence Duration (ms)',
      min: 500,
      max: 8000,
      step: 500,
      value: timeSinceLastHeartbeatMs,
      unit: ' ms',
      onChange: (v) => {
        timeSinceLastHeartbeatMs = parseInt(v);
        updatePhi();
      }
    });

    OS.segmented(controls, {
      label: 'Accrual Threshold (Φ)',
      options: [
        { label: 'Aggressive (Φ = 4)', value: 4 },
        { label: 'Cassandra Default (Φ = 8)', value: 8 },
        { label: 'Conservative (Φ = 12)', value: 12 }
      ],
      value: phiThreshold,
      onChange: (v) => {
        phiThreshold = parseInt(v);
        updatePhi();
      }
    });

    OS.button(controls, 'Emit Fresh Heartbeat', () => {
      timeSinceLastHeartbeatMs = 980;
      updatePhi();
    }, { primary: true });

    const cv = OS.canvas(host, {
      height: 240,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Φ-Accrual Failure Detector: Φ = -log₁₀(P_later(t - t_last))`, 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = calculatedPhi >= phiThreshold ? OS.C.rose : OS.C.green;
        ctx.fillText(detectorLog, 16, 46);

        // Meter Card
        const barX = 20;
        const barY = 70;
        const barW = Math.max(260, w - 40);
        const barH = 125;

        ctx.fillStyle = OS.C.surface;
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Current Suspicion Level: Φ = ${calculatedPhi} (Threshold = ${phiThreshold})`, barX + 16, barY + 28);

        // Visual Gauge Bar
        const meterW = barW - 60;
        const meterH = 14;
        ctx.fillStyle = OS.rgba(OS.C.line, 0.4);
        ctx.beginPath();
        ctx.roundRect(barX + 16, barY + 42, meterW, meterH, 4);
        ctx.fill();

        const fraction = Math.min(1.0, calculatedPhi / 14);
        ctx.fillStyle = calculatedPhi >= phiThreshold ? OS.C.rose : OS.C.green;
        ctx.beginPath();
        ctx.roundRect(barX + 16, barY + 42, meterW * fraction, meterH, 4);
        ctx.fill();

        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText(`Last Heartbeat: ${timeSinceLastHeartbeatMs}ms ago (Historical Average: ${meanHeartbeatMs}ms)`, barX + 16, barY + 76);
        ctx.fillText('Accrual detectors output a continuous scale of suspicion rather than a rigid binary up/down flag.', barX + 16, barY + 98);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 6. Gossip Protocols & The SWIM Membership Mesh
   * -------------------------------------------------------------------------- */
  OS.register('swimGossip', function (host) {
    let nodes = [
      { id: 'Node-1', state: 'ALIVE' },
      { id: 'Node-2', state: 'ALIVE' },
      { id: 'Node-3', state: 'ALIVE' },
      { id: 'Node-4', state: 'ALIVE' }
    ];
    let gossipLog = 'SWIM Cluster healthy: O(1) weak infection-style membership dissemination.';

    const controls = OS.controls(host);
    OS.button(controls, 'Direct Ping (Node-1 ➔ Node-2)', () => {
      gossipLog = 'DIRECT PING: Node-1 sent ping to Node-2; ACK received in 2ms.';
      render();
    }, { primary: true });

    OS.button(controls, 'Kill Node-2 (Simulate Crash)', () => {
      nodes[1].state = 'SUSPECT';
      gossipLog = '⚠️ DIRECT PING FAILED: Node-1 dispatched indirect `ping-req` probes via Node-3 and Node-4!';
      render();
    });

    OS.button(controls, 'Indirect Ping-Req Confirm Dead', () => {
      nodes[1].state = 'DEAD';
      gossipLog = '💀 CONFIRMED DEAD: Node-3 & Node-4 both failed to reach Node-2. Infection dissemination broadcasting DEAD.';
      render();
    });

    OS.button(controls, 'Revive Cluster', () => {
      nodes.forEach(n => n.state = 'ALIVE');
      gossipLog = 'Cluster reset to ALIVE.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('SWIM Protocol: Indirect Ping-Req & Epidemic Dissemination', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = gossipLog.includes('DEAD') ? OS.C.rose : gossipLog.includes('SUSPECT') ? OS.C.amber : OS.C.accent;
        ctx.fillText(gossipLog, 16, 46);

        // Nodes
        const nW = Math.min(85, (w - 70) / 4);
        const nH = 85;
        const startY = 70;

        nodes.forEach((n, idx) => {
          const nx = 16 + idx * (nW + 14);
          const isDead = n.state === 'DEAD';
          const isSuspect = n.state === 'SUSPECT';

          ctx.fillStyle = isDead ? OS.rgba(OS.C.rose, 0.2) : isSuspect ? OS.rgba(OS.C.amber, 0.2) : OS.rgba(OS.C.teal, 0.12);
          ctx.strokeStyle = isDead ? OS.C.rose : isSuspect ? OS.C.amber : OS.C.teal;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(nx, startY, nW, nH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(11, 'mono', 600);
          ctx.fillText(n.id, nx + 10, startY + 24);

          ctx.font = OS.font(10, 'sans', 700);
          ctx.fillStyle = isDead ? OS.C.rose : isSuspect ? OS.C.amber : OS.C.green;
          ctx.fillText(n.state, nx + 10, startY + 48);
        });

        // Footnote
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('SWIM separates detection (intermittent indirect ping) from dissemination (piggybacked gossip on regular pings).', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 7. Distributed Mutual Exclusion: Ricart-Agrawala
   * -------------------------------------------------------------------------- */
  OS.register('ricartAgrawala', function (host) {
    let lockHolder = 'None';
    let raLog = 'Ricart-Agrawala algorithm initialized. 2(N - 1) message exchange.';

    const controls = OS.controls(host);
    OS.button(controls, 'Node-A Requests Lock (TS=10)', () => {
      lockHolder = 'Node-A';
      raLog = 'Node-A sent REQUEST(TS=10) to all nodes ➔ Received OK replies from all ➔ Entered Critical Section!';
      render();
    }, { primary: true });

    OS.button(controls, 'Node-B Concurrent Request (TS=15)', () => {
      raLog = 'Node-B requested with TS=15. Node-A defers reply because TS=10 < TS=15! Node-B blocked.';
      render();
    });

    OS.button(controls, 'Node-A Releases Lock', () => {
      lockHolder = 'Node-B';
      raLog = 'Node-A finished critical section; sent deferred OK to Node-B ➔ Node-B enters Critical Section!';
      render();
    });

    OS.button(controls, 'Release All', () => {
      lockHolder = 'None';
      raLog = 'Critical section empty.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Ricart-Agrawala Distributed Mutual Exclusion (Timestamp Priority)', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = OS.C.accent;
        ctx.fillText(raLog, 16, 46);

        // Critical section box
        const boxX = 20;
        const boxY = 70;
        const boxW = Math.max(260, w - 40);
        const boxH = 95;

        ctx.fillStyle = OS.C.surface;
        ctx.strokeStyle = lockHolder !== 'None' ? OS.C.amber : OS.C.line;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Shared Distributed Resource / Critical Section', boxX + 16, boxY + 28);

        ctx.font = OS.font(14, 'display', 700);
        ctx.fillStyle = lockHolder !== 'None' ? OS.C.green : OS.C.muted;
        ctx.fillText(`Current Lock Holder: [ ${lockHolder} ]`, boxX + 16, boxY + 58);

        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Lowest timestamp wins ties. Defers replies to higher timestamps until exiting critical section.', boxX + 16, boxY + 82);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 8. Leader Election: Bully vs Chang-Roberts Ring
   * -------------------------------------------------------------------------- */
  OS.register('bullyElection', function (host) {
    let mode = 'bully'; // 'bully' vs 'ring'
    let nodes = [
      { id: 'Node-1', rank: 1, isLeader: false },
      { id: 'Node-2', rank: 2, isLeader: false },
      { id: 'Node-3', rank: 3, isLeader: false },
      { id: 'Node-4', rank: 4, isLeader: true }
    ];
    let electionLog = 'Node-4 is active Leader (Highest rank).';

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Algorithm',
      options: [
        { label: 'Bully Algorithm (O(N²))', value: 'bully' },
        { label: 'Chang-Roberts Ring (O(N log N))', value: 'ring' }
      ],
      value: mode,
      onChange: (v) => { mode = v; render(); }
    });

    OS.button(controls, 'Kill Node-4 (Crash Leader)', () => {
      nodes[3].isLeader = false;
      electionLog = 'Node-4 crashed! Node-1 detects timeout and initiates election.';
      render();
    }, { primary: true });

    OS.button(controls, 'Run Election', () => {
      nodes[2].isLeader = true;
      electionLog = mode === 'bully'
        ? 'BULLY: Node-1 sent ELECTION to 2 & 3. Node-3 bullied Node-2 and won -> Node-3 is LEADER!'
        : 'RING: Election message circulated around ring; highest alive ID (3) declared LEADER!';
      render();
    });

    OS.button(controls, 'Reset Cluster', () => {
      nodes.forEach((n, idx) => n.isLeader = (idx === 3));
      electionLog = 'Node-4 restored as Leader.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Leader Election: ${mode === 'bully' ? 'Garcia-Molina Bully Algorithm' : 'Chang-Roberts Ring Algorithm'}`, 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = electionLog.includes('crashed') ? OS.C.rose : OS.C.green;
        ctx.fillText(electionLog, 16, 46);

        // Draw Nodes
        const nW = Math.min(85, (w - 70) / 4);
        const nH = 85;
        const startY = 70;

        nodes.forEach((n, idx) => {
          const nx = 16 + idx * (nW + 14);

          ctx.fillStyle = n.isLeader ? OS.rgba(OS.C.green, 0.2) : OS.rgba(OS.C.surface, 0.9);
          ctx.strokeStyle = n.isLeader ? OS.C.green : OS.C.line;
          ctx.lineWidth = n.isLeader ? 2 : 1;
          ctx.beginPath();
          ctx.roundRect(nx, startY, nW, nH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(11, 'mono', 600);
          ctx.fillText(n.id, nx + 10, startY + 24);

          ctx.font = OS.font(9, 'mono', 400);
          ctx.fillStyle = OS.C.muted;
          ctx.fillText(`Rank: ${n.rank}`, nx + 10, startY + 44);

          ctx.font = OS.font(9, 'sans', 700);
          ctx.fillStyle = n.isLeader ? OS.C.green : OS.C.faint;
          ctx.fillText(n.isLeader ? 'LEADER' : 'Follower', nx + 10, startY + 68);
        });

        // Summary
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Bully broadcasts to all higher IDs; Ring passes candidate IDs unidirectionally.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 9. The Consensus Hierarchy & FLP Impossibility
   * -------------------------------------------------------------------------- */
  OS.register('flpImpossibility', function (host) {
    let systemState = 'BIVALENT'; // BIVALENT (0 or 1 possible) vs DECIDED
    let flpLog = 'Initial configuration is BIVALENT: both 0 and 1 are reachable outcomes.';

    const controls = OS.controls(host);
    OS.button(controls, 'Adversary Delays Message (Maintain Bivalence)', () => {
      systemState = 'BIVALENT';
      flpLog = '⚡ FLP ADVERSARY: Asynchronous network delayed critical vote! System forced back into bivalent state.';
      render();
    }, { primary: true });

    OS.button(controls, 'Partially Synchronous Progress (Decide 1)', () => {
      systemState = 'DECIDED_1';
      flpLog = '✓ TIMEOUT BOUNDED: Partial synchrony assumption satisfied -> Decision reached (Value: 1)!';
      render();
    });

    OS.button(controls, 'Reset System', () => {
      systemState = 'BIVALENT';
      flpLog = 'System reset to uncommitted bivalent state.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Fischer-Lynch-Paterson (FLP) Impossibility (1985)', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = systemState.includes('BIVALENT') ? OS.C.amber : OS.C.green;
        ctx.fillText(flpLog, 16, 46);

        // State Card
        const boxX = 20;
        const boxY = 70;
        const boxW = Math.max(260, w - 40);
        const boxH = 95;

        ctx.fillStyle = OS.C.surface;
        ctx.strokeStyle = systemState.includes('BIVALENT') ? OS.C.amber : OS.C.green;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Configuration Status: ${systemState}`, boxX + 16, boxY + 28);

        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Theorem: In a purely asynchronous network with even 1 crash failure, no deterministic consensus protocol is guaranteed to terminate.', boxX + 16, boxY + 55);
        ctx.fillText('Practical Solution: Introduce randomized timers (Raft) or partial synchrony bounds (Dwork, Lynch, Stockmeyer).', boxX + 16, boxY + 75);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 10. Classical Paxos: Multi-Paxos & HDFS QJM
   * -------------------------------------------------------------------------- */
  OS.register('multiPaxos', function (host) {
    let ballotNum = 101;
    let acceptors = [
      { id: 'JournalNode-1', promiseBallot: 100, acceptedVal: 'Edit#401' },
      { id: 'JournalNode-2', promiseBallot: 100, acceptedVal: 'Edit#401' },
      { id: 'JournalNode-3', promiseBallot: 100, acceptedVal: 'Edit#401' }
    ];
    let paxosLog = 'Quorum Journal Manager (QJM) synchronized at Edit#401.';

    const controls = OS.controls(host);
    OS.button(controls, 'Phase 1: Prepare(Ballot=102)', () => {
      ballotNum = 102;
      acceptors.forEach(a => a.promiseBallot = ballotNum);
      paxosLog = 'PHASE 1 (Prepare): Proposer sent Prepare(102); 3/3 Acceptors promised not to accept ballots < 102.';
      render();
    }, { primary: true });

    OS.button(controls, 'Phase 2: Accept(Ballot=102, "Edit#402")', () => {
      acceptors.slice(0, 2).forEach(a => a.acceptedVal = 'Edit#402');
      paxosLog = 'PHASE 2 (Accept): Quorum majority (2/3) accepted "Edit#402" -> Edit log committed to HDFS!';
      render();
    });

    OS.button(controls, 'Reset JournalNodes', () => {
      ballotNum = 101;
      acceptors.forEach(a => { a.promiseBallot = 100; a.acceptedVal = 'Edit#401'; });
      paxosLog = 'JournalNodes reset.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Multi-Paxos & HDFS Quorum Journal Manager (QJM Consensus)', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = paxosLog.includes('committed') ? OS.C.green : OS.C.accent;
        ctx.fillText(paxosLog, 16, 46);

        // Draw 3 Acceptors
        const aW = Math.min(130, (w - 60) / 3);
        const aH = 95;
        const startY = 70;

        acceptors.forEach((a, idx) => {
          const ax = 16 + idx * (aW + 14);

          ctx.fillStyle = OS.rgba(OS.C.teal, 0.12);
          ctx.strokeStyle = OS.C.teal;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(ax, startY, aW, aH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(11, 'mono', 600);
          ctx.fillText(a.id, ax + 10, startY + 24);

          ctx.font = OS.font(9, 'mono', 400);
          ctx.fillStyle = OS.C.muted;
          ctx.fillText(`Promise: ${a.promiseBallot}`, ax + 10, startY + 46);

          ctx.font = OS.font(10, 'mono', 700);
          ctx.fillStyle = OS.C.accent;
          ctx.fillText(a.acceptedVal, ax + 10, startY + 70);
        });

        // Footnote
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('HDFS NameNode Active/Standby HA uses QJM Multi-Paxos to guarantee zero edit log divergence.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

})();
