# AWS to GCP Migration

## Introduction

This plan moves Equity from AWS to Google Cloud Platform (GCP), establishing a secure, observable foundation for the application and future Google Cloud AI features.

## Google AI Ecosystem

The migration creates a path to use Google's AI services where they add clear value to Equity:

- **Gemini models and model choice:** the [Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview), previously known as Vertex AI, provides access to Google's Gemini models and a broader model ecosystem. This gives us a managed place to evaluate models for research assistance and financial information summaries.
- **Grounded answers:** [Grounding options](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/overview) can connect model responses to Google Search or approved company data through Agent Search and RAG Engine. For Equity, this could help produce answers with traceable sources instead of unsupported market claims.
- **AI with analytics data:** [BigQuery AI](https://docs.cloud.google.com/bigquery/docs/ai-introduction) combines analytics, machine learning, vector search, and generative AI functions. It may be useful if the platform later centralizes market or portfolio research data for analysis.
- **Managed agent lifecycle:** the Agent Platform includes tools for building and operating agents, with security, governance, and observability features. This could support future research workflows without requiring the initial migration to introduce an AI agent.

These are options to assess after the core platform is stable on GCP. Any AI feature will need a defined use case and review of source quality, data access, privacy, latency, and cost before implementation.

## Migration Approach

The migration will proceed in small, verifiable stages:

1. **Assess and plan:** make an inventory of what exists and how it could move to GCP. Review the platform's GKE, IAM, VPC, and observability needs, along with dependencies and operational requirements. This stage is assessment only; use the findings to plan a gradual migration and rank work by business value and migration effort.

   | Migration effort | High business value | Low business value |
   | --- | --- | --- |
   | **Low** | **1 — Prioritise first** | **3 — Take as capacity allows** |
   | **High** | **2 — Plan as major work** | **4 — Defer or reconsider** |

   A possible order is IAM and VPC foundations, then GKE, observability before workload moves, and finally gradual workload migration and cutover. The matrix and dependencies will refine this order during assessment.

2. **Build the foundation:** use Terraform to provision the GCP environment, networking, identity, secrets access, and GKE. Keep infrastructure changes reviewable and repeatable.
3. **Deploy and observe:** deploy the containerized application through the existing GitOps workflow, then confirm health checks, metrics, dashboards, alerting, security controls, and operational procedures before moving traffic.
4. **Cut over and review:** move traffic in a controlled way, monitor application and platform signals, and verify the user experience and key operational requirements. Record the cutover steps and decision points.

The detailed deployment, observability, and cutover strategies will be documented alongside this plan. A rollback plan is still to be added before the migration is treated as ready for production cutover.
