/* ==========================================================================
   Distributed Systems, Node by Node — Consensus Deep-Dive & Distributed Storage
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 11. The Raft Consensus Protocol in Depth
   * -------------------------------------------------------------------------- */
  OS.register('raftDeepDive', function (host) {
    let logs = [
      { index: 1, term: 1, cmd: 'x<-4' },
      { index: 2, term: 1, cmd: 'y<-9' },
      { index: 3, term: 2, cmd: 'z<-1' }
    ];
    let commitIndex = 2;
    let raftLogMsg = 'Log Matching Property: Entries 1 & 2 committed by leader across majority.';

    const controls = OS.controls(host);
    OS.button(controls, 'Append Client Write (x<-5)', () => {
      const nextIdx = logs.length + 1;
      logs.push({ index: nextIdx, term: 2, cmd: 'x<-5' });
      raftLogMsg = `APPEND: Entry #${nextIdx} (Term 2) appended to leader log (Uncommitted).`;
      render();
    }, { primary: true });

    OS.button(controls, 'Quorum ACK ➔ Commit Entry', () => {
      if (commitIndex < logs.length) {
        commitIndex++;
        raftLogMsg = `✓ COMMITTED: Entry #${commitIndex} replicated to majority ➔ Safe to apply to State Machine!`;
      }
      render();
    });

    OS.button(controls, 'Rollback Uncommitted', () => {
      if (logs.length > commitIndex) {
        logs = logs.slice(0, commitIndex);
        raftLogMsg = 'SAFETY TRUNCATION: Uncommitted un-replicated tail entries overwritten by new leader!';
      }
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Raft Log Matching & State Machine Commit (CommitIndex: ${commitIndex})`, 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = raftLogMsg.includes('COMMITTED') ? OS.C.green : OS.C.accent;
        ctx.fillText(raftLogMsg, 16, 46);

        // Draw log entries
        const startY = 70;
        const eW = Math.min(65, (w - 60) / Math.max(5, logs.length));
        const eH = 65;

        logs.forEach((entry, idx) => {
          const ex = 16 + idx * (eW + 8);
          const isCommitted = entry.index <= commitIndex;

          ctx.fillStyle = isCommitted ? OS.rgba(OS.C.green, 0.2) : OS.rgba(OS.C.amber, 0.2);
          ctx.strokeStyle = isCommitted ? OS.C.green : OS.C.amber;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(ex, startY, eW, eH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(`Idx ${entry.index}`, ex + 6, startY + 20);

          ctx.font = OS.font(8, 'mono', 400);
          ctx.fillStyle = OS.C.muted;
          ctx.fillText(`T:${entry.term}`, ex + 6, startY + 36);

          ctx.font = OS.font(9, 'mono', 700);
          ctx.fillStyle = isCommitted ? OS.C.green : OS.C.amber;
          ctx.fillText(entry.cmd, ex + 6, startY + 54);
        });

        // Summary
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Log Matching: If two logs contain an entry with the same index and term, they are identical up to that index.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 12. Byzantine Fault Tolerance (BFT) & PBFT
   * -------------------------------------------------------------------------- */
  OS.register('pbftByzantine', function (host) {
    let nodes = [
      { id: 'Replica-0 (Primary)', traitor: false, status: 'Pre-Prepared' },
      { id: 'Replica-1', traitor: false, status: 'Prepared' },
      { id: 'Replica-2', traitor: false, status: 'Prepared' },
      { id: 'Replica-3', traitor: true, status: 'MALICIOUS (Lie)' }
    ];
    let pbftLog = 'PBFT Cluster: N = 3f + 1 = 4 nodes tolerate f = 1 Byzantine traitor.';

    const controls = OS.controls(host);
    OS.button(controls, 'Broadcast Prepare Phase (2f Quorum)', () => {
      pbftLog = 'PREPARE: 3 honest nodes exchanged cryptographic hashes. 2f+1 honest quorum satisfied despite Replica-3 lying!';
      render();
    }, { primary: true });

    OS.button(controls, 'Commit Phase (2f Quorum)', () => {
      pbftLog = '✓ COMMITTED: 2f+1 Commit messages verified. State machine safely executes transaction!';
      render();
    });

    OS.button(controls, 'Toggle Replica-3 Traitor', () => {
      nodes[3].traitor = !nodes[3].traitor;
      nodes[3].status = nodes[3].traitor ? 'MALICIOUS (Lie)' : 'Honest';
      pbftLog = `Replica-3 is now ${nodes[3].status}.`;
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Practical Byzantine Fault Tolerance (Castro & Liskov 1999)', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = pbftLog.includes('COMMITTED') ? OS.C.green : OS.C.accent;
        ctx.fillText(pbftLog, 16, 46);

        // Draw 4 nodes
        const nW = Math.min(85, (w - 70) / 4);
        const nH = 85;
        const startY = 70;

        nodes.forEach((n, idx) => {
          const nx = 16 + idx * (nW + 14);

          ctx.fillStyle = n.traitor ? OS.rgba(OS.C.rose, 0.2) : OS.rgba(OS.C.teal, 0.12);
          ctx.strokeStyle = n.traitor ? OS.C.rose : OS.C.teal;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(nx, startY, nW, nH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(n.id.split(' ')[0], nx + 8, startY + 24);

          ctx.font = OS.font(8, 'sans', 700);
          ctx.fillStyle = n.traitor ? OS.C.rose : OS.C.green;
          ctx.fillText(n.traitor ? 'TRAITOR' : 'HONEST', nx + 8, startY + 46);

          ctx.font = OS.font(8, 'mono', 400);
          ctx.fillStyle = OS.C.muted;
          ctx.fillText(n.status.slice(0, 10), nx + 8, startY + 68);
        });

        // Footnote
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('3f + 1 Rule: 2f + 1 honest nodes are always guaranteed to outvote f Byzantine malicious liars.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 13. Primary-Backup Replication Lag & Failover
   * -------------------------------------------------------------------------- */
  OS.register('primaryBackup', function (host) {
    let mode = 'async'; // async vs sync
    let primaryLogSeq = 140;
    let backupLogSeq = 138; // 2 behind
    let repMsg = 'Asynchronous replication: Primary acknowledges writes immediately. Replication lag = 2 transactions.';

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Replication Mode',
      options: [
        { label: 'Asynchronous (Low Latency, Lag Risk)', value: 'async' },
        { label: 'Synchronous (Zero Lag, Wait Penalty)', value: 'sync' }
      ],
      value: mode,
      onChange: (v) => {
        mode = v;
        if (mode === 'sync') backupLogSeq = primaryLogSeq;
        repMsg = mode === 'sync' ? 'Synchronous: Primary blocks write until Backup acknowledges.' : 'Asynchronous: Replication lag possible under heavy load.';
        render();
      }
    });

    OS.button(controls, 'Write to Primary', () => {
      primaryLogSeq++;
      if (mode === 'sync') {
        backupLogSeq = primaryLogSeq;
        repMsg = `WRITE: Seq #${primaryLogSeq} committed synchronously on both Primary & Backup.`;
      } else {
        repMsg = `WRITE: Seq #${primaryLogSeq} acknowledged by Primary! Backup is lagging (${primaryLogSeq - backupLogSeq} behind).`;
      }
      render();
    }, { primary: true });

    OS.button(controls, 'Simulate Primary Crash & Failover', () => {
      if (mode === 'async' && backupLogSeq < primaryLogSeq) {
        repMsg = `💥 DATA LOSS FAILOVER: Primary crashed! Promoted Backup lost ${primaryLogSeq - backupLogSeq} un-replicated transactions!`;
      } else {
        repMsg = '✓ CLEAN FAILOVER: Zero data loss; Backup promoted to new Primary with identical log state!';
      }
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Primary-Backup Replication (${mode.toUpperCase()}): Lag = ${primaryLogSeq - backupLogSeq} txns`, 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = repMsg.includes('LOSS') ? OS.C.rose : OS.C.accent;
        ctx.fillText(repMsg, 16, 46);

        // Nodes
        const colW = Math.min(180, (w - 60) / 2);
        const yTop = 68;
        const boxH = 85;

        // Primary
        ctx.fillStyle = OS.rgba(OS.C.accent, 0.12);
        ctx.strokeStyle = OS.C.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(16, yTop, colW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('Primary Server', 26, yTop + 24);
        ctx.font = OS.font(16, 'display', 700);
        ctx.fillStyle = OS.C.accent;
        ctx.fillText(`WAL Seq: #${primaryLogSeq}`, 26, yTop + 56);

        // Backup
        const bX = colW + 32;
        ctx.fillStyle = OS.rgba(OS.C.teal, 0.12);
        ctx.strokeStyle = OS.C.teal;
        ctx.beginPath();
        ctx.roundRect(bX, yTop, colW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('Backup / Standby Server', bX + 12, yTop + 24);
        ctx.font = OS.font(16, 'display', 700);
        ctx.fillStyle = OS.C.teal;
        ctx.fillText(`WAL Seq: #${backupLogSeq}`, bX + 12, yTop + 56);

        // Summary
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Semi-synchronous replication: Wait for at least 1 backup before ACK to prevent data loss on primary crash.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 14. Quorums, Read Repair & Hinted Handoff
   * -------------------------------------------------------------------------- */
  OS.register('readRepair', function (host) {
    let replicas = [
      { id: 'Node-1', val: 'V2', ts: 200 },
      { id: 'Node-2', val: 'V1', ts: 100 }, // Stale!
      { id: 'Node-3', val: 'V2', ts: 200 }
    ];
    let rrLog = 'Node-2 holds stale value V1. Quorum read will detect discrepancy.';

    const controls = OS.controls(host);
    OS.button(controls, 'Quorum Read (Node-1 & Node-2)', () => {
      rrLog = 'READ REPAIR DETECTED: Read V2(ts:200) vs V1(ts:100). Returned V2 to client and scheduled async repair to Node-2!';
      render();
    }, { primary: true });

    OS.button(controls, 'Execute Background Read Repair', () => {
      replicas[1].val = 'V2';
      replicas[1].ts = 200;
      rrLog = '✓ ANTI-ENTROPY REPAIRED: Node-2 updated to latest value V2. All replicas synchronized!';
      render();
    });

    OS.button(controls, 'Hinted Handoff (Write to Dead Node-3)', () => {
      rrLog = 'HINTED HANDOFF: Node-3 was unreachable; Coordinator stored Hint on disk to replay when Node-3 returns.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Dynamo-Style Read Repair & Hinted Handoff (Anti-Entropy)', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = rrLog.includes('REPAIRED') ? OS.C.green : OS.C.accent;
        ctx.fillText(rrLog, 16, 46);

        // Replicas
        const rW = Math.min(130, (w - 60) / 3);
        const rH = 90;
        const startY = 70;

        replicas.forEach((r, idx) => {
          const rx = 16 + idx * (rW + 14);
          const isStale = r.val === 'V1';

          ctx.fillStyle = isStale ? OS.rgba(OS.C.rose, 0.15) : OS.rgba(OS.C.green, 0.15);
          ctx.strokeStyle = isStale ? OS.C.rose : OS.C.green;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(rx, startY, rW, rH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(11, 'mono', 600);
          ctx.fillText(r.id, rx + 10, startY + 24);

          ctx.font = OS.font(14, 'display', 700);
          ctx.fillStyle = isStale ? OS.C.rose : OS.C.green;
          ctx.fillText(`Value: ${r.val}`, rx + 10, startY + 54);

          ctx.font = OS.font(9, 'mono', 400);
          ctx.fillStyle = OS.C.muted;
          ctx.fillText(isStale ? 'STALE VERSION' : 'LATEST VERSION', rx + 10, startY + 76);
        });

        // Summary
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Read repair fixes stale replicas opportunistically during quorum reads; Merkle trees fix cold data in the background.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 15. Distributed Commit: 2PC vs 3PC
   * -------------------------------------------------------------------------- */
  OS.register('twoPhaseVsThreePhase', function (host) {
    let mode = '2pc'; // 2pc vs 3pc
    let state = 'INIT';
    let commitLog = 'Select protocol and step through phases to test coordinator crash resilience.';

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Commit Protocol',
      options: [
        { label: 'Two-Phase Commit (2PC - Blocking)', value: '2pc' },
        { label: 'Three-Phase Commit (3PC - Non-Blocking)', value: '3pc' }
      ],
      value: mode,
      onChange: (v) => { mode = v; state = 'INIT'; commitLog = `Switched to ${v.toUpperCase()}.`; render(); }
    });

    OS.button(controls, 'Step Phase ➔', () => {
      if (mode === '2pc') {
        if (state === 'INIT') { state = 'PREPARE'; commitLog = '2PC Phase 1: Coordinator broadcasts PREPARE. Cohorts vote YES.'; }
        else if (state === 'PREPARE') { state = 'COMMIT'; commitLog = '2PC Phase 2: Coordinator broadcasts COMMIT. Cohorts commit transaction.'; }
      } else {
        if (state === 'INIT') { state = 'CAN_COMMIT'; commitLog = '3PC Phase 1: Can-Commit? Cohorts agree.'; }
        else if (state === 'CAN_COMMIT') { state = 'PRE_COMMIT'; commitLog = '3PC Phase 2: Pre-Commit! Cohorts know everyone agreed to proceed.'; }
        else if (state === 'PRE_COMMIT') { state = 'DO_COMMIT'; commitLog = '3PC Phase 3: Do-Commit! Safe non-blocking commit executed.'; }
      }
      render();
    }, { primary: true });

    OS.button(controls, 'Kill Coordinator (Test Block)', () => {
      if (mode === '2pc' && state === 'PREPARE') {
        commitLog = '⚠️ 2PC BLOCKING STALL: Coordinator crashed after Prepare! Cohorts are locked indefinitely holding resources!';
      } else if (mode === '3pc' && state === 'PRE_COMMIT') {
        commitLog = '✓ 3PC NON-BLOCKING RECOVERY: Cohorts in Pre-Commit state can safely elect new coordinator and commit!';
      }
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Atomic Commit: ${mode === '2pc' ? 'Two-Phase Commit (2PC)' : 'Skeen Three-Phase Commit (3PC)'}`, 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = commitLog.includes('BLOCKING') ? OS.C.rose : OS.C.green;
        ctx.fillText(commitLog, 16, 46);

        // State Box
        const boxX = 20;
        const boxY = 70;
        const boxW = Math.max(260, w - 40);
        const boxH = 90;

        ctx.fillStyle = OS.C.surface;
        ctx.strokeStyle = commitLog.includes('BLOCKING') ? OS.C.rose : OS.C.line;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Current Protocol State: [ ${state} ]`, boxX + 16, boxY + 28);

        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText(mode === '2pc'
          ? '2PC Flaw: If coordinator crashes after cohorts enter Prepared, participants cannot tell if commit was decided.'
          : '3PC Innovation: Pre-Commit state guarantees no participant commits while another aborts, breaking the blocking stall.',
          boxX + 16, boxY + 60);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 16. Modern Distributed Storage: Google Spanner & TrueTime
   * -------------------------------------------------------------------------- */
  OS.register('spannerCommitWait', function (host) {
    let t1CommitTime = 100;
    let t2StartTime = 115;
    let epsilon = 7; // 7ms
    let waitLog = 'Spanner Commit-Wait Rule: Transaction T1 acquires locks, picks s = TT.now().latest, and waits 2ε before release.';

    const controls = OS.controls(host);
    OS.button(controls, 'Execute Commit-Wait (Wait 2ε)', () => {
      waitLog = `✓ COMMIT WAIT HONORED: T1 waited 2ε (14ms) before releasing locks. Guaranteed: s1 (${t1CommitTime}) < s2 (${t2StartTime}) globally!`;
      render();
    }, { primary: true });

    OS.button(controls, 'Simulate Premature Lock Release (Anomaly)', () => {
      waitLog = '⚠️ LINEARIZABILITY VIOLATION: Released lock before 2ε wait! T2 observed stale snapshot because physical clocks overlapped.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Google Spanner: TrueTime Commit Wait & External Consistency', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = waitLog.includes('VIOLATION') ? OS.C.rose : OS.C.green;
        ctx.fillText(waitLog, 16, 46);

        // Timeline Box
        const boxX = 20;
        const boxY = 70;
        const boxW = Math.max(260, w - 40);
        const boxH = 95;

        ctx.fillStyle = OS.C.surface;
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Commit Timestamp Assignment: s₁ = TT.now().latest (Uncertainty ε = ${epsilon}ms)`, boxX + 16, boxY + 28);

        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Commit Wait Invariant: The leader does not release commit locks until TT.now().earliest > s₁.', boxX + 16, boxY + 54);
        ctx.fillText('Result: External consistency (strict serializability) across globally distributed continents without central coordinator.', boxX + 16, boxY + 76);
      }
    });

    function render() { cv.redraw(); }
  });

})();
