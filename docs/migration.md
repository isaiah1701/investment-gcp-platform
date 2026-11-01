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

1. **Assess and map:** document the AWS components, dependencies, data flows, access controls, and operational requirements, then map each to a GCP service or decide whether it should be retired or redesigned.
2. **Build the foundation:** use Terraform to provision the GCP environment, networking, identity, secrets access, and GKE. Keep infrastructure changes reviewable and repeatable.
3. **Deploy and observe:** deploy the containerized application through the existing GitOps workflow, then confirm health checks, metrics, dashboards, alerting, security controls, and operational procedures before moving traffic.
4. **Cut over and review:** move traffic in a controlled way, monitor application and platform signals, and verify the user experience and key operational requirements. Record the cutover steps and decision points.

The detailed deployment, observability, and cutover strategies will be documented alongside this plan. A rollback plan is still to be added before the migration is treated as ready for production cutover.
