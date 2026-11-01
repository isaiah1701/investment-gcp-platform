# Equity

## About

Equity is an investment dashboard that helps companies research listed equities, monitor market data, and organize watchlists and portfolio positions for informed decision-making. Built with Next.js and deployed on Google Kubernetes Engine (GKE), it uses a cloud-native foundation designed to scale as business needs and usage grow.

## Demo

The walkthrough shows Equity’s portfolio dashboard: searching for a stock, reviewing its market data, adding it to a watchlist, and tracking holdings with market value and unrealized profit or loss. The demo uses illustrative prices; portfolio and watchlist data are saved in the browser.



https://github.com/user-attachments/assets/9e018b59-37ed-4de6-842d-e06cb2aed6db





## Architecture

Equity is a Next.js app packaged as a container and run on Google Kubernetes Engine. GitHub Actions checks the app, builds and scans the image, and records its immutable digest in Git. Argo CD applies the Helm configuration from Git to deploy the app; Terraform manages the supporting cloud infrastructure, identity, secrets access, and DNS. Prometheus and Grafana provide application monitoring.

<img width="1753" height="897" alt="image" src="https://github.com/user-attachments/assets/ea715426-3258-4225-b506-2f73146df6fb" />

## Cloud Migration Strategy

The AWS-to-GCP migration plan explains how I would move Equity to Google Cloud while keeping the service reliable through the transition. It covers prioritising work by business value and effort, mapping the existing architecture to GCP, preparing observability, and using SLOs to guide gradual traffic shifts and rollback. It also explores how Google's AI ecosystem could support future Equity features. [Read the migration plan](docs/migration.md).

## Trade-offs and Lessons Learned

Cloud-to-cloud migration is highly transferable when you understand the system—its workloads, data flows, identity, networking, and reliability needs—rather than focusing on provider-specific resource names. Start from those requirements, then map each capability to the new cloud. Managed services can reduce operational work, but may increase provider-specific coupling.

## Setup

### Local

Requires Docker. Build and run from the repository root; the container uses mock market data by default.

```bash
docker build -t equity:local .
docker run --rm -p 3000:3000 equity:local
```

Open `http://localhost:3000`. For live market data, set `INVESTMENT_DATA_MODE=live` and `INVESTMENT_API_KEY` in the repository-root `.env` file, then pass it with `docker run --env-file .env`.

### GCP

Follow the [Terraform bootstrap guide](terraform/bootstrap/README.md), configure the required GCP and GitHub Actions identity settings, then run the **Terraform Production Deploy** workflow. After GKE is provisioned, run `scripts/bootstrap-argocd.sh` to install Argo CD and sync the platform.
