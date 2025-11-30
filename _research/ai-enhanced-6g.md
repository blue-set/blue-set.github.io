---
layout: research
title: "Smart Signals: AI-Driven Interference Cancellation for 6G Networks"
tags: [6G, Deep Reinforcement Learning, LSTM, Wireless]
pdf_url: /assets/pdfs/ResearchPlan6G.pdf
excerpt: "6G promises a hyper-connected world, but network densification brings massive interference. This research proposes an AI-native physical layer using DRL to proactively manage signal clashes."
---

## Research Theme
The next generation of wireless, 6G, will enable a hyper-connected world for applications like the Metaverse and autonomous systems. A core 6G strategy is network densification—installing many more base stations to improve capacity. However, this creates massive co-channel interference. This research will use Artificial Intelligence (AI) as a foundational component of the 6G network to intelligently solve this interference problem.

## Problem Statement
*   **The Paradox:** Adding more base stations is meant to improve 6G but backfires by creating overwhelming signal interference.
*   **The Impact:** This interference degrades network performance, causing slower speeds, more errors, and higher latency.
*   **The Gap:** Traditional interference management methods are not effective in these complex 6G environments.
*   **The Urgency:** Future 6G applications demand ultra-reliable, low-latency connections that are impossible to deliver if interference is not controlled.

## Thesis Statement
This research will develop an AI-based framework embedded directly into 6G base stations to proactively manage interference. The system will use Deep Reinforcement Learning (DRL) to train an AI agent that instantly selects the best interference cancellation (IC) technique (e.g., PIC or SIC) for the current network conditions.

## Methodology
*   **System Architecture (at the Network Edge)**
    *   **Prediction Layer:** An LSTM neural network will forecast upcoming interference levels.
    *   **Decision Engine:** A DRL agent will be the "brain," analysing the current state to choose the optimal action.
    *   **Adaptive IC Module:** A reconfigurable hardware/software block that executes the agent's command.
*   **DRL Agent Formulation**
    *   **State:** Real-time channel data (CSI), signal strength (RSSI), user mobility, QoS needs.
    *   **Actions:** Select PIC, SIC, a HYBRID mode, or NO_IC.
    *   **Reward:** Maximizing throughput and reliability while minimizing errors and delays.
*   **Simulation & Validation**
    *   **Training:** Offline training using MATLAB and the QuaDRiGa channel model.
    *   **Testing:** Validation in the ns-3 network simulator.

## Desired Outcomes
1.  A High-Performance DRL-Assisted Interference Canceller.
2.  A Proactive Interference Prediction Model.
3.  A Foundation for the AI-RAN.

<div style="margin-top: 30px; text-align: center;">
  <a href="{{ page.pdf_url | relative_url }}" class="button" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Full Proposal (PDF)</a>
</div>
