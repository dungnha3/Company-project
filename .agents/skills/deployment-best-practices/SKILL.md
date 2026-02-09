---
name: deployment-best-practices
description: Enterprise-grade deployment guidelines for Frontend and Backend applications. Use when deploying, configuring CI/CD, containerizing, or orchestrating applications. Covers Docker, Kubernetes, GitOps, deployment strategies, secrets management, and frontend-specific patterns.
license: MIT
metadata:
  author: enterprise
  version: "1.0.0"
---

# Deployment Best Practices

Comprehensive deployment optimization guide for full-stack applications, designed for AI agents and LLMs. Contains 55+ rules across 9 categories covering both Frontend and Backend deployment patterns. Prioritized by impact from critical (Docker, CI/CD) to incremental (monitoring, compliance).

## When to Apply

Reference these guidelines when:
- Containerizing applications with Docker
- Setting up CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Deploying to Kubernetes clusters
- Choosing deployment strategies (Blue-Green, Canary, Rolling)
- Managing secrets and configuration
- Deploying frontend to CDN/static hosting
- Setting up monitoring and observability

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Docker Best Practices | CRITICAL | `docker-` |
| 2 | CI/CD Pipelines | CRITICAL | `cicd-` |
| 3 | Kubernetes Deployment | HIGH | `k8s-` |
| 4 | Deployment Strategies | HIGH | `strategy-` |
| 5 | Frontend Deployment | HIGH | `fe-` |
| 6 | Secrets Management | MEDIUM-HIGH | `secrets-` |
| 7 | Infrastructure as Code | MEDIUM | `iac-` |
| 8 | Monitoring & Logging | MEDIUM | `monitor-` |
| 9 | Security & Compliance | MEDIUM | `security-` |

## Quick Reference

### 1. Docker Best Practices (CRITICAL)

- `docker-multi-stage` - Use multi-stage builds to reduce image size
- `docker-alpine` - Use Alpine/distroless base images
- `docker-non-root` - Run containers as non-root user
- `docker-layer-cache` - Optimize layer caching order
- `docker-dockerignore` - Use .dockerignore to exclude files
- `docker-healthcheck` - Add HEALTHCHECK instruction
- `docker-single-process` - One process per container
- `docker-labels` - Use labels for metadata and automation

### 2. CI/CD Pipelines (CRITICAL)

- `cicd-gitops` - Use GitOps for deployment (ArgoCD, Flux)
- `cicd-pipeline-as-code` - Define pipelines in version control
- `cicd-security-scans` - Integrate SAST/DAST security scans
- `cicd-artifact-versioning` - Use semantic versioning for artifacts
- `cicd-parallel-stages` - Parallelize independent stages
- `cicd-environment-parity` - Keep dev/staging/prod similar
- `cicd-automated-tests` - Run tests before deployment
- `cicd-rollback-automation` - Automate rollback on failure

### 3. Kubernetes Deployment (HIGH)

- `k8s-resource-limits` - Set CPU/memory requests and limits
- `k8s-health-probes` - Configure liveness/readiness/startup probes
- `k8s-pdb` - Use PodDisruptionBudgets for availability
- `k8s-hpa` - Configure Horizontal Pod Autoscaler
- `k8s-network-policies` - Define network policies
- `k8s-configmaps` - Use ConfigMaps for configuration
- `k8s-namespaces` - Organize resources with namespaces
- `k8s-helm-charts` - Use Helm for templating deployments

### 4. Deployment Strategies (HIGH)

- `strategy-rolling` - Rolling updates for zero-downtime
- `strategy-blue-green` - Blue-Green for instant rollback
- `strategy-canary` - Canary for gradual rollout
- `strategy-feature-flags` - Feature flags for progressive delivery
- `strategy-graceful-shutdown` - Handle SIGTERM properly

### 5. Frontend Deployment (HIGH)

- `fe-static-hosting` - Deploy to Vercel/Netlify/S3+CloudFront
- `fe-cdn-cache` - Configure CDN caching headers
- `fe-code-splitting` - Bundle splitting for lazy loading
- `fe-env-variables` - Inject env vars at build time
- `fe-preview-deployments` - Preview deploys for each PR
- `fe-lighthouse-ci` - Run Lighthouse in CI pipeline
- `fe-bundle-analysis` - Analyze and optimize bundle size

### 6. Secrets Management (MEDIUM-HIGH)

- `secrets-external` - Use external secret managers (Vault, AWS SM)
- `secrets-rotation` - Implement automatic rotation
- `secrets-encryption` - Encrypt secrets at rest
- `secrets-no-env` - Avoid secrets in environment variables
- `secrets-audit` - Enable audit logging for secret access

### 7. Infrastructure as Code (MEDIUM)

- `iac-terraform` - Use Terraform for infrastructure
- `iac-state-remote` - Store state remotely with locking
- `iac-modules` - Create reusable modules
- `iac-validation` - Validate before apply
- `iac-drift-detection` - Detect configuration drift

### 8. Monitoring & Logging (MEDIUM)

- `monitor-structured-logs` - Use structured JSON logging
- `monitor-trace-correlation` - Correlate requests with trace IDs
- `monitor-metrics-export` - Export Prometheus metrics
- `monitor-alerting` - Define actionable alerts
- `monitor-dashboard` - Create operational dashboards

### 9. Security & Compliance (MEDIUM)

- `security-image-scanning` - Scan images for vulnerabilities
- `security-rbac` - Implement RBAC for access control
- `security-pod-security` - Apply Pod Security Standards
- `security-supply-chain` - Verify image provenance
- `security-compliance-checks` - Automate compliance checks
- `security-audit-logs` - Enable audit logging

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/docker-multi-stage.md
rules/fe-static-hosting.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
