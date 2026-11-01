# AWS to GCP Migration

## Introduction

This document describes the planned migration of the Equity platform from AWS to Google Cloud Platform (GCP). The goal is to run the application on a secure, observable, and maintainable cloud foundation while making it practical to explore Google's AI ecosystem as the product evolves.

GCP provides a natural base for the existing Kubernetes deployment and a path to managed AI services, including Google's Gemini models and the [Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview), previously known as Vertex AI. These capabilities could support future features such as research assistance or summarising financial information. They are an opportunity for the platform, not a requirement for the initial migration: any AI use would be evaluated separately for usefulness, data handling, cost, and latency before being introduced.

## Migration Approach

The migration will proceed in small, verifiable stages:

1. **Assess and map:** document the AWS components, dependencies, data flows, access controls, and operational requirements, then map each to a GCP service or decide whether it should be retired or redesigned.
2. **Build the foundation:** use Terraform to provision the GCP environment, networking, identity, secrets access, and GKE. Keep infrastructure changes reviewable and repeatable.
3. **Deploy and observe:** deploy the containerized application through the existing GitOps workflow, then confirm health checks, metrics, dashboards, alerting, security controls, and operational procedures before moving traffic.
4. **Cut over and review:** move traffic in a controlled way, monitor application and platform signals, and verify the user experience and key operational requirements. Record the cutover steps and decision points.

The detailed deployment, observability, and cutover strategies will be documented alongside this plan. A rollback plan is still to be added before the migration is treated as ready for production cutover.
