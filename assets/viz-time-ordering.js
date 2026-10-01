/* ==========================================================================
   Distributed Systems, Node by Node — Time, Ordering & Global State
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * HERO: Distributed Consensus & Network Partition Arena
   * -------------------------------------------------------------------------- */
  OS.register('consensusHero', function (host) {
    let nodes = [
      { id: 'Node-A', partition: 1, role: 'FOLLOWER', term: 1, votes: 0 },
      { id: 'Node-B', partition: 1, role: 'FOLLOWER', term: 1, votes: 0 },
      { id: 'Node-C', partition: 2, role: 'LEADER', term: 1, votes: 3 },
      { id: 'Node-D', partition: 2, role: 'FOLLOWER', term: 1, votes: 0 },
      { id: 'Node-E', partition: 2, role: 'FOLLOWER', term: 1, votes: 0 }
    ];
    let partitionActive = false;
    let clusterLog = '5-Node Cluster operating nominally: Node-C elected Leader in Term 1.';

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Network Topology',
      options: [
        { label: 'Fully Connected Mesh', value: 'mesh' },
        { label: 'Network Partition [A,B] | [C,D,E]', value: 'partition' }
      ],
      value: partitionActive ? 'partition' : 'mesh',
      onChange: (v) => {
        partitionActive = (v === 'partition');
        if (partitionActive) {
          clusterLog = '⚡ NETWORK SPLIT: Minor partition [A,B] isolated from Major partition [C,D,E]!';
        } else {
          clusterLog = '🤝 PARTITION HEALED: Network re-converged. Node-C asserts leadership across all 5 nodes.';
          nodes.forEach(n => {
            if (n.id === 'Node-C') n.role = 'LEADER';
            else n.role = 'FOLLOWER';
          });
        }
        render();
      }
    });

    OS.button(controls, 'Kill Node-C (Trigger Election)', () => {
      const c = nodes.find(n => n.id === 'Node-C');
      if (c) {
        c.role = 'DEAD';
        // If partition is active, only [C,D,E] group has majority if C was alive, but if C is dead, D & E are only 2 nodes (< 3).
        const majorAlive = nodes.filter(n => n.partition === 2 && n.role !== 'DEAD').length;
        if (majorAlive >= 3) {
          nodes.find(n => n.id === 'Node-D').role = 'LEADER';
          clusterLog = 'ELECTION: Node-D won majority in partition 2 -> Promoted to Leader.';
        } else {
          clusterLog = 'QUORUM LOSS: 2 nodes alive in partition 2 (< 3 majority) -> No leader can be elected!';
        }
      }
      render();
    }, { primary: true });

    OS.button(controls, 'Revive All Nodes', () => {
      nodes.forEach((n, idx) => {
        n.role = (n.id === 'Node-C') ? 'LEADER' : 'FOLLOWER';
        n.term = 1;
      });
      clusterLog = 'All nodes revived and re-synchronized.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 250,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Distributed Consensus Arena: 5 Nodes (${partitionActive ? 'Split-Brain Partitioned' : 'Fully Connected Mesh'})`, 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = clusterLog.includes('LOSS') || clusterLog.includes('SPLIT') ? OS.C.rose : OS.C.green;
        ctx.fillText(clusterLog, 16, 46);

        // Draw Nodes
        const nW = Math.min(80, (w - 70) / 5);
        const nH = 95;
        const startY = 70;

        nodes.forEach((n, idx) => {
          const nx = 16 + idx * (nW + 10);
          const isLeader = n.role === 'LEADER';
          const isDead = n.role === 'DEAD';

          ctx.fillStyle = isLeader ? OS.rgba(OS.C.green, 0.2) : isDead ? OS.rgba(OS.C.rose, 0.2) : OS.rgba(OS.C.surface, 0.9);
          ctx.strokeStyle = isLeader ? OS.C.green : isDead ? OS.C.rose : OS.C.line;
          ctx.lineWidth = isLeader ? 2 : 1;
          ctx.beginPath();
          ctx.roundRect(nx, startY, nW, nH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(n.id, nx + 8, startY + 22);

          ctx.font = OS.font(9, 'sans', 700);
          ctx.fillStyle = isLeader ? OS.C.green : isDead ? OS.C.rose : OS.C.muted;
          ctx.fillText(n.role, nx + 8, startY + 44);

          ctx.font = OS.font(8, 'mono', 400);
          ctx.fillStyle = OS.C.faint;
          ctx.fillText(`Part: ${n.partition}`, nx + 8, startY + 64);
          ctx.fillText(`Term: ${n.term}`, nx + 8, startY + 80);
        });

        // Partition dividing wall if active
        if (partitionActive) {
          const wallX = 16 + 2 * (nW + 10) - 5;
          ctx.strokeStyle = OS.C.rose;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(wallX, startY - 10);
          ctx.lineTo(wallX, startY + nH + 20);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = OS.C.rose;
          ctx.font = OS.font(9, 'display', 700);
          ctx.fillText('NETWORK PARTITION WALL', wallX - 55, startY + nH + 34);
        }

        // Footnote
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Majority Quorum Rule: Strictly > N/2 nodes (3/5) required to make progress or elect a leader.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 1. Physical Clocks, Skew & TrueTime
   * -------------------------------------------------------------------------- */
  OS.register('trueTimeSkew', function (host) {
    let epsilonMs = 7; // TrueTime uncertainty bound (typically 1-7ms)
    let currentServerTime = 1609459200000;
    let clockLog = 'TrueTime API returns interval [earliest, latest] where now() is guaranteed to fall.';

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'TrueTime Uncertainty (ε)',
      options: [
        { label: 'Atomic Clocks / GPS (ε = 1ms)', value: 1 },
        { label: 'Datacenter Standard (ε = 7ms)', value: 7 },
        { label: 'Uncalibrated NTP (ε = 50ms)', value: 50 }
      ],
      value: epsilonMs,
      onChange: (v) => {
        epsilonMs = parseInt(v);
        clockLog = `Uncertainty bound updated to ±${epsilonMs}ms. Commit-wait delay must equal 2ε (${2 * epsilonMs}ms).`;
        render();
      }
    });

    OS.button(controls, 'Sample TT.now()', () => {
      currentServerTime = Date.now();
      clockLog = `Sampled TT.now() = [${currentServerTime - epsilonMs}, ${currentServerTime + epsilonMs}] (Window: ${2 * epsilonMs}ms)`;
      render();
    }, { primary: true });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Google TrueTime API: Interval Bounds [t - ε, t + ε] with ε = ${epsilonMs}ms`, 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = OS.C.accent;
        ctx.fillText(clockLog, 16, 46);

        // Visual Window Display
        const barX = 20;
        const barY = 75;
        const barW = Math.max(260, w - 40);
        const barH = 80;

        ctx.fillStyle = OS.C.surface;
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 8);
        ctx.fill();
        ctx.stroke();

        const earliest = currentServerTime - epsilonMs;
        const latest = currentServerTime + epsilonMs;

        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillStyle = OS.C.rose;
        ctx.fillText(`TT.now().earliest: ...${String(earliest).slice(-5)} ms`, barX + 16, barY + 28);

        ctx.fillStyle = OS.C.green;
        ctx.fillText(`TT.now().latest:   ...${String(latest).slice(-5)} ms`, barX + 16, barY + 52);

        // Center True Time indicator
        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillText(`Physical TrueTime is mathematically guaranteed inside window width = 2ε = ${2 * epsilonMs}ms.`, barX + 16, barY + 72);

        // Summary
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Spanner commit-wait: transactions wait 2ε before releasing locks, guaranteeing global linearizability.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 2. Logical Clocks & Lamport Timestamps
   * -------------------------------------------------------------------------- */
  OS.register('lamportClocks', function (host) {
    let p1 = { id: 'Proc-1', clock: 0 };
    let p2 = { id: 'Proc-2', clock: 0 };
    let events = [];
    let msgLog = 'Lamport Rule: Local event: L = L + 1. Message send/recv: L_recv = max(L_local, L_msg) + 1.';

    function localEvent(proc) {
      proc.clock++;
      events.push(`${proc.id} internal event (L=${proc.clock})`);
      msgLog = `${proc.id} local event -> Timestamp L=${proc.clock}`;
      render();
    }

    function sendMsg(from, to) {
      from.clock++;
      const sentTime = from.clock;
      to.clock = Math.max(to.clock, sentTime) + 1;
      events.push(`${from.id} -> ${to.id} (L_sent=${sentTime}, L_recv=${to.clock})`);
      msgLog = `MESSAGE: ${from.id} (L=${sentTime}) ➔ ${to.id} (Calculated L=max(${to.clock - 1}, ${sentTime})+1 = ${to.clock})!`;
      render();
    }

    const controls = OS.controls(host);
    OS.button(controls, 'P1 Local Event', () => localEvent(p1));
    OS.button(controls, 'Send P1 ➔ P2', () => sendMsg(p1, p2), { primary: true });
    OS.button(controls, 'P2 Local Event', () => localEvent(p2));
    OS.button(controls, 'Send P2 ➔ P1', () => sendMsg(p2, p1));
    OS.button(controls, 'Reset Clocks', () => {
      p1.clock = 0;
      p2.clock = 0;
      events = [];
      msgLog = 'Clocks reset to 0.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Lamport Timestamps: L(e) = max(L_local, L_msg) + 1`, 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = msgLog.includes('MESSAGE') ? OS.C.amber : OS.C.accent;
        ctx.fillText(msgLog, 16, 46);

        // Process Clocks Cards
        const colW = Math.min(180, (w - 60) / 2);
        const yTop = 68;
        const boxH = 85;

        // Process 1
        ctx.fillStyle = OS.rgba(OS.C.accent, 0.12);
        ctx.strokeStyle = OS.C.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(16, yTop, colW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(p1.id, 26, yTop + 24);
        ctx.font = OS.font(16, 'display', 700);
        ctx.fillStyle = OS.C.accent;
        ctx.fillText(`Clock L = ${p1.clock}`, 26, yTop + 56);

        // Process 2
        const p2X = colW + 32;
        ctx.fillStyle = OS.rgba(OS.C.teal, 0.12);
        ctx.strokeStyle = OS.C.teal;
        ctx.beginPath();
        ctx.roundRect(p2X, yTop, colW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(p2.id, p2X + 12, yTop + 24);
        ctx.font = OS.font(16, 'display', 700);
        ctx.fillStyle = OS.C.teal;
        ctx.fillText(`Clock L = ${p2.clock}`, p2X + 12, yTop + 56);

        // Summary
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Happens-Before Relationship (a -> b): If a -> b, then L(a) < L(b). (Converse is NOT true for scalar clocks).', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 3. Vector Clocks & Causal Consistency
   * -------------------------------------------------------------------------- */
  OS.register('vectorClocks', function (host) {
    let vA = [1, 0]; // [A, B]
    let vB = [0, 1]; // [A, B]
    let conflictState = 'CONCURRENT CONFLICT: V_A [1,0] and V_B [0,1] are neither >= nor <= each other!';

    const controls = OS.controls(host);
    OS.button(controls, 'Node A Event: V_A[0]++', () => {
      vA[0]++;
      checkCausality();
    }, { primary: true });

    OS.button(controls, 'Node B Event: V_B[1]++', () => {
      vB[1]++;
      checkCausality();
    });

    OS.button(controls, 'Sync A ➔ B', () => {
      vB[0] = Math.max(vA[0], vB[0]);
      vB[1] = Math.max(vA[1], vB[1]) + 1;
      checkCausality();
    });

    OS.button(controls, 'Reset Vectors', () => {
      vA = [1, 0];
      vB = [0, 1];
      checkCausality();
    });

    function checkCausality() {
      const aGteB = vA[0] >= vB[0] && vA[1] >= vB[1];
      const bGteA = vB[0] >= vA[0] && vB[1] >= vA[1];

      if (aGteB && !bGteA) {
        conflictState = `CAUSAL ORDER: Node A is causally STRICTLY AFTER Node B (B ➔ A).`;
      } else if (bGteA && !aGteB) {
        conflictState = `CAUSAL ORDER: Node B is causally STRICTLY AFTER Node A (A ➔ B).`;
      } else if (aGteB && bGteA) {
        conflictState = `IDENTICAL: States are synchronized.`;
      } else {
        conflictState = `⚠️ CONCURRENT CONFLICT: V_A [${vA}] || V_B [${vB}] neither dominates (Sibling conflict in Dynamo/Riak).`;
      }
      render();
    }

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Vector Clocks: V = [count_A, count_B] Causal Order Tracking', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = conflictState.includes('CONFLICT') ? OS.C.rose : OS.C.green;
        ctx.fillText(conflictState, 16, 46);

        // Vector Boxes
        const colW = Math.min(180, (w - 60) / 2);
        const yTop = 68;
        const boxH = 85;

        // Node A
        ctx.fillStyle = OS.rgba(OS.C.accent, 0.12);
        ctx.strokeStyle = OS.C.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(16, yTop, colW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('Node A Version Vector', 26, yTop + 24);
        ctx.font = OS.font(16, 'mono', 700);
        ctx.fillStyle = OS.C.accent;
        ctx.fillText(`[ ${vA[0]}, ${vA[1]} ]`, 26, yTop + 56);

        // Node B
        const bX = colW + 32;
        ctx.fillStyle = OS.rgba(OS.C.teal, 0.12);
        ctx.strokeStyle = OS.C.teal;
        ctx.beginPath();
        ctx.roundRect(bX, yTop, colW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('Node B Version Vector', bX + 12, yTop + 24);
        ctx.font = OS.font(16, 'mono', 700);
        ctx.fillStyle = OS.C.teal;
        ctx.fillText(`[ ${vB[0]}, ${vB[1]} ]`, bX + 12, yTop + 56);

        // Summary
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('If V_1 <= V_2 and V_1 != V_2, event 1 happened before event 2. Otherwise, events are concurrent.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

  /* --------------------------------------------------------------------------
   * 4. Global State & Chandy-Lamport Snapshots
   * -------------------------------------------------------------------------- */
  OS.register('chandyLamport', function (host) {
    let pA = { balance: 100, recorded: false };
    let pB = { balance: 50, recorded: false };
    let channelInFlight = 0;
    let snapshotLog = 'Chandy-Lamport Snapshot Engine ready. Total system wealth: $150.';

    const controls = OS.controls(host);
    OS.button(controls, 'Initiate Snapshot (Marker from A)', () => {
      pA.recorded = true;
      channelInFlight = 20; // in flight transfer
      pA.balance -= 20;
      snapshotLog = 'P_A recorded state ($80) and sent Marker down FIFO channel along with $20 in-flight.';
      render();
    }, { primary: true });

    OS.button(controls, 'P_B Receives Marker', () => {
      pB.recorded = true;
      pB.balance += channelInFlight;
      channelInFlight = 0;
      snapshotLog = `P_B received Marker! Recorded P_B state ($${pB.balance}) & closed channel. Total wealth preserved = $150!`;
      render();
    });

    OS.button(controls, 'Reset Snapshot', () => {
      pA = { balance: 100, recorded: false };
      pB = { balance: 50, recorded: false };
      channelInFlight = 0;
      snapshotLog = 'Snapshot reset to initial state.';
      render();
    });

    const cv = OS.canvas(host, {
      height: 230,
      render: function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);

        ctx.font = OS.font(13, 'display', 600);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Chandy-Lamport Distributed Snapshot (Consistent Global State)', 16, 24);

        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillStyle = snapshotLog.includes('preserved') ? OS.C.green : OS.C.accent;
        ctx.fillText(snapshotLog, 16, 46);

        // Nodes
        const colW = Math.min(180, (w - 60) / 2);
        const yTop = 68;
        const boxH = 85;

        // P_A
        ctx.fillStyle = pA.recorded ? OS.rgba(OS.C.green, 0.15) : OS.rgba(OS.C.surface, 0.9);
        ctx.strokeStyle = pA.recorded ? OS.C.green : OS.C.line;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(16, yTop, colW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('Process A', 26, yTop + 24);
        ctx.font = OS.font(14, 'mono', 700);
        ctx.fillStyle = OS.C.accent;
        ctx.fillText(`Balance: $${pA.balance}`, 26, yTop + 52);
        ctx.font = OS.font(9, 'sans', 400);
        ctx.fillStyle = pA.recorded ? OS.C.green : OS.C.muted;
        ctx.fillText(pA.recorded ? '✓ Snapshot Captured' : 'Running', 26, yTop + 72);

        // P_B
        const bX = colW + 32;
        ctx.fillStyle = pB.recorded ? OS.rgba(OS.C.green, 0.15) : OS.rgba(OS.C.surface, 0.9);
        ctx.strokeStyle = pB.recorded ? OS.C.green : OS.C.line;
        ctx.beginPath();
        ctx.roundRect(bX, yTop, colW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('Process B', bX + 12, yTop + 24);
        ctx.font = OS.font(14, 'mono', 700);
        ctx.fillStyle = OS.C.teal;
        ctx.fillText(`Balance: $${pB.balance}`, bX + 12, yTop + 52);
        ctx.font = OS.font(9, 'sans', 400);
        ctx.fillStyle = pB.recorded ? OS.C.green : OS.C.muted;
        ctx.fillText(pB.recorded ? '✓ Snapshot Captured' : 'Running', bX + 12, yTop + 72);

        // Summary
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('Consistent Cut: No message is recorded as received unless its sending event is also recorded.', 16, h - 14);
      }
    });

    function render() { cv.redraw(); }
  });

})();
