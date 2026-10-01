# Distributed Systems, Node by Node

> **An Explorable Architectural Guide to Logical Time, Consensus, Fault Tolerance & Replication**  
> Live URL: [https://deepshah08.github.io/a2z-distributed-systems/](https://deepshah08.github.io/a2z-distributed-systems/)

A zero-dependency, pure web standards interactive textbook and visual exploration engine inspired by *LLMs, Token by Token*, *Operating Systems, Cycle by Cycle*, *Computer Networks, Packet by Packet*, and *System Design, Component by Component*.

---

## 📚 Curricular Scope & Foundational Sources

Synthesized from the recognized canon of distributed algorithms and fault-tolerant computing:
- **Maarten van Steen & Andrew S. Tanenbaum** — *Distributed Systems (3rd/4th Edition)*
- **Nancy Lynch** — *Distributed Algorithms*
- **Martin Kleppmann** — *Designing Data-Intensive Applications (Part II: Distributed Data)*
- **Leslie Lamport** — *Time, Clocks, and the Ordering of Events in a Distributed System (1978)*
- **Leslie Lamport** — *The Part-Time Parliament (Paxos, 1998)*
- **Diego Ongaro & John Ousterhout** — *In Search of an Understandable Consensus Algorithm (Raft, 2014)*
- **K. Mani Chandy & Leslie Lamport** — *Distributed Snapshots: Determining Global States (1985)*
- **Miguel Castro & Barbara Liskov** — *Practical Byzantine Fault Tolerance (PBFT, 1999)*
- **James C. Corbett et al.** — *Spanner: Google’s Globally-Distributed Database (2012)*

---

## 🧩 17 Live Interactive Simulators

### Flagship Hero Arena
- **Hero: The Consensus & Network Partition Arena**: 5-node cluster with dynamic partition splitting ($[A, B]$ vs $[C, D, E]$), leader termination, majority quorum voting, and partition reconciliation.

### Part I: Time, Ordering & Global State (Ch 01–04)
1. **Physical Clocks & TrueTime**: Clock drift ($\rho$) and TrueTime uncertainty intervals $[t-\epsilon, t+\epsilon]$.
2. **Lamport Timestamps**: Happens-Before ($\to$) message DAG tracking with $L(e) = \max(L_{\text{local}}, L_{\text{msg}}) + 1$.
3. **Vector Clocks & Causality**: Array clocks detecting concurrent sibling conflicts without physical clocks.
4. **Chandy-Lamport Snapshots**: Non-blocking marker propagation capturing consistent cuts and in-flight channel balances.

### Part II: Failure Detection, Membership & Coordination (Ch 05–08)
5. **$\Phi$-Accrual Failure Detector**: Continuous suspicion calculation $\Phi = -\log_{10}(P_{\text{later}})$ based on sliding window heartbeat intervals.
6. **SWIM Gossip Protocol**: Direct ping failure detection with indirect multi-hop `ping-req` probes and epidemic dissemination.
7. **Ricart-Agrawala Mutual Exclusion**: Timestamp-priority distributed lock contest exchanging $2(N - 1)$ messages.
8. **Leader Elections (Bully vs Ring)**: Garcia-Molina Bully broadcast dominance vs Chang-Roberts unidirectional ring elections.

### Part III: Consensus & Fault Tolerance (Ch 09–12)
9. **FLP Impossibility Result**: Asynchronous scheduling adversary maintaining bivalent uncommitted state.
10. **Multi-Paxos & HDFS QJM**: Prepare/Promise and Accept/Accepted phases with monotonic ballot numbers across JournalNodes.
11. **Raft Protocol in Depth**: Log matching property, term increments, randomized election timers, and uncommitted entry truncation.
12. **PBFT Byzantine Fault Tolerance**: 4-node cluster with 1 malicious traitor node executing Pre-Prepare, Prepare, and Commit $2f$ quorums.

### Part IV: Replication & Distributed Storage (Ch 13–16)
13. **Primary-Backup Replication**: Synchronous vs asynchronous write latency, replication lag, and failover data loss risks.
14. **Quorums & Read Repair**: Dynamo-style leaderless quorum reads ($R+W > N$) with background anti-entropy reconciliation and hinted handoff.
15. **Distributed Atomic Commit (2PC vs 3PC)**: Two-Phase Commit blocking coordinator stalls vs Three-Phase Commit non-blocking Pre-Commit recovery.
16. **Google Spanner TrueTime Commit-Wait**: Commit-wait delay ($2\epsilon$) guaranteeing strict global linearizability without a centralized coordinator.

---

## 🧪 Automated Multi-Viewport Headless Audit

Run the built-in headless test harness across 4 viewports (320px mobile, 480px, 768px tablet, 1200px desktop):

```bash
npm test
```

Audits:
- Complete DOM mounting of all 17 visualizers.
- Event listener triggers (every button, slider, and selector fires without exceptions).
- Finite coordinate math (zero `NaN`, `Infinity`, or unbounded layout regressions).
- High-DPI canvas backing store scaling.

---

## 🚀 Deployment & Static Serving

The project adheres to strict **zero-dependency web standards**:
- Pure HTML5, CSS3, and modern ES6+ JavaScript.
- No Node.js runtime required to serve.
- Compatible with any static file server:

```bash
# Preview locally
python3 -m http.server 8080
```
