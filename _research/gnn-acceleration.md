---
layout: research
title: "Breaking the Memory Wall: Hardware Acceleration for Graph Neural Networks"
tags: [Edge AI, GNN, FPGA, Computer Architecture]
pdf_url: /assets/pdfs/ResearchPlanPR.pdf
excerpt: "Graph Neural Networks are powerful but memory-hungry, making them difficult to run on edge devices. This project explores memory-centric hardware architectures to enable real-time GNNs on the edge."
---

## Research Theme
In the modern data ecosystem, there is a paradigm shift towards both decentralized computing (Edge AI) and the analysis of complex, interconnected data structures using Graph Neural Networks (GNNs). However, a fundamental conflict exists: GNNs are notoriously memory-bound and computationally intensive, while edge devices operate under stringent constraints. This research proposes to bridge this gap by developing novel energy-efficient, memory-centric hardware architectures specifically designed for GNN acceleration.

## Problem Statement
*   **The Bottleneck:** Traditional computing architectures are inefficient for GNNs due to irregular, data-dependent memory accesses.
*   **The Memory Wall:** Poor cache utilization leads to high latency and prohibitive energy consumption.
*   **The Need:** A new class of hardware accelerators that adopt a memory-centric approach, treating data locality and energy efficiency as first-order design principles.

## Thesis Statement
This research proposes the development of an energy-efficient, memory-centric hardware accelerator framework for GNNs. The goal is to design a holistic system, based on algorithm-hardware co-design principles, that fundamentally mitigates the data movement bottleneck by integrating computation with on-chip memory systems.

## Methodology
*   **Workload Characterization:** Comprehensive analysis of GNN models on existing edge platforms to identify bottlenecks.
*   **Architectural Design:** Designing a specialized on-chip memory hierarchy with graph-aware caching policies and a parallel processing engine.
*   **Algorithm-Hardware Co-design:** Developing hardware-aware quantization and pruning methods.
*   **FPGA-Based Prototyping:** Implementing a prototype on an FPGA for real-world testing.
*   **Comprehensive Evaluation:** Benchmarking against state-of-the-art CPUs, GPUs, and accelerators using metrics like latency, throughput, and energy efficiency.

## Desired Outcomes
1.  A novel framework and verifiable prototype of a memory-centric GNN accelerator.
2.  Enablement of Advanced Edge AI for smart infrastructure.
3.  Enhanced Energy Efficiency and Sustainability.

<div style="margin-top: 30px; text-align: center;">
  <a href="{{ page.pdf_url }}" class="button" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Full Proposal (PDF)</a>
</div>
