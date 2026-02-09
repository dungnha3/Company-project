# Deployment Best Practices

**Version 1.0.0**  
Enterprise Engineering  
February 2026

> **Note:**  
> This document is for agents and LLMs to follow when deploying, configuring,  
> or maintaining deployment pipelines for full-stack applications.

---

## Abstract

Comprehensive deployment guide for Frontend and Backend applications. Contains 55+ rules across 9 categories, covering Docker containerization, CI/CD pipelines, Kubernetes orchestration, deployment strategies, frontend hosting, secrets management, and security patterns.

---

## Table of Contents

1. [Docker Best Practices](#1-docker-best-practices) — **CRITICAL**
2. [CI/CD Pipelines](#2-cicd-pipelines) — **CRITICAL**
3. [Kubernetes Deployment](#3-kubernetes-deployment) — **HIGH**
4. [Deployment Strategies](#4-deployment-strategies) — **HIGH**
5. [Frontend Deployment](#5-frontend-deployment) — **HIGH**
6. [Secrets Management](#6-secrets-management) — **MEDIUM-HIGH**
7. [Infrastructure as Code](#7-infrastructure-as-code) — **MEDIUM**
8. [Monitoring & Logging](#8-monitoring--logging) — **MEDIUM**
9. [Security & Compliance](#9-security--compliance) — **MEDIUM**

---

## 1. Docker Best Practices

**Impact: CRITICAL**

Docker images directly affect deployment speed, security, and resource usage.

### 1.1 Use Multi-Stage Builds

**Impact: CRITICAL (reduces image size by 80-90%)**

Separate build dependencies from runtime to create minimal production images.

**Incorrect: Single-stage build**

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Image includes dev dependencies, source code, build tools (~1.5GB)
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Correct: Multi-stage build**

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
USER nodejs
EXPOSE 3000
CMD ["node", "dist/server.js"]
# Final image: ~150MB
```

### 1.2 Use Alpine/Distroless Base Images

**Impact: HIGH (smaller attack surface, faster pulls)**

```dockerfile
# Good: Alpine (5MB base)
FROM node:20-alpine

# Better: Distroless (no shell, no package manager)
FROM gcr.io/distroless/nodejs20-debian12

# For Java applications
FROM eclipse-temurin:21-jre-alpine
```

### 1.3 Run Containers as Non-Root

**Impact: CRITICAL (security)**

```dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

CMD ["node", "server.js"]
```

### 1.4 Optimize Layer Caching

**Impact: HIGH (faster builds)**

Order instructions from least to most frequently changed.

**Incorrect: Poor cache utilization**

```dockerfile
COPY . .
RUN npm install
# Any file change invalidates npm install cache
```

**Correct: Optimized layer order**

```dockerfile
# Dependencies change less frequently than code
COPY package*.json ./
RUN npm ci

# Code changes frequently
COPY src/ ./src/
RUN npm run build
```

### 1.5 Use .dockerignore

**Impact: MEDIUM (faster builds, smaller context)**

```dockerignore
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
.env
.env.*
*.md
tests/
coverage/
.nyc_output/
dist/
build/
.idea/
.vscode/
```

### 1.6 Add HEALTHCHECK Instruction

**Impact: HIGH (enables orchestrator health management)**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

### 1.7 One Process Per Container

**Impact: HIGH (scalability, maintainability)**

**Incorrect: Multiple processes**

```dockerfile
# Running nginx + node in one container
CMD nginx && node server.js
```

**Correct: Single process**

```dockerfile
# Container A: nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf

# Container B: node
FROM node:20-alpine
CMD ["node", "server.js"]

# Use docker-compose to orchestrate
```

### 1.8 Use Labels for Metadata

**Impact: LOW (automation, documentation)**

```dockerfile
FROM node:20-alpine

LABEL org.opencontainers.image.title="My App"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="2026-02-09"
LABEL org.opencontainers.image.authors="team@company.com"
LABEL org.opencontainers.image.source="https://github.com/org/repo"
```

---

## 2. CI/CD Pipelines

**Impact: CRITICAL**

Well-designed pipelines ensure consistent, reliable deployments.

### 2.1 Use GitOps for Deployment

**Impact: HIGH (declarative, auditable, rollback-friendly)**

```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: HEAD
    path: apps/my-app/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### 2.2 Pipeline as Code

**Impact: HIGH (version control, reproducibility)**

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/my-app \
            my-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### 2.3 Integrate Security Scans

**Impact: HIGH (shift-left security)**

```yaml
# Security scanning stage
security:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    
    # SAST - Static Application Security Testing
    - name: Run Semgrep
      uses: returntocorp/semgrep-action@v1
      with:
        config: p/security-audit
    
    # Dependency scanning
    - name: Run Snyk
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
    
    # Container image scanning
    - name: Run Trivy
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
        severity: 'CRITICAL,HIGH'
        exit-code: '1'
```

### 2.4 Semantic Versioning for Artifacts

**Impact: MEDIUM (traceability)**

```yaml
- name: Semantic Version
  id: version
  uses: paulhatch/semantic-version@v5.3.0
  with:
    tag_prefix: "v"
    major_pattern: "(MAJOR)"
    minor_pattern: "(MINOR)"
    version_format: "${major}.${minor}.${patch}"

- name: Tag and Push
  run: |
    docker tag myapp:latest myapp:${{ steps.version.outputs.version }}
    docker push myapp:${{ steps.version.outputs.version }}
```

### 2.5 Parallelize Independent Stages

**Impact: MEDIUM (faster pipelines)**

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit

  test-integration:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration

  # All parallel jobs must pass before build
  build:
    needs: [lint, test-unit, test-integration]
    runs-on: ubuntu-latest
```

### 2.6 Environment Parity

**Impact: HIGH (prevents "works on my machine")**

```yaml
# Use the same Docker image across all environments
services:
  app:
    image: myapp:${VERSION}
    environment:
      - NODE_ENV=${ENVIRONMENT}
      - DATABASE_URL=${DATABASE_URL}

# Environment-specific config only via env vars, not different images
```

### 2.7 Automated Tests Gate

**Impact: CRITICAL (quality assurance)**

```yaml
deploy-production:
  needs: [test, security-scan, integration-test]
  if: |
    github.ref == 'refs/heads/main' &&
    needs.test.result == 'success' &&
    needs.security-scan.result == 'success'
  environment:
    name: production
    url: https://app.example.com
```

### 2.8 Automated Rollback

**Impact: HIGH (reduce MTTR)**

```yaml
- name: Deploy with rollback
  run: |
    kubectl rollout status deployment/my-app --timeout=300s || \
    kubectl rollout undo deployment/my-app
```

---

## 3. Kubernetes Deployment

**Impact: HIGH**

Proper K8s configuration ensures reliability and scalability.

### 3.1 Set Resource Requests and Limits

**Impact: CRITICAL (prevents resource exhaustion)**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: myapp:1.0.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 3.2 Configure Health Probes

**Impact: CRITICAL (reliability)**

```yaml
spec:
  containers:
  - name: my-app
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8080
      failureThreshold: 30
      periodSeconds: 10
```

### 3.3 Use PodDisruptionBudgets

**Impact: HIGH (availability during maintenance)**

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2  # Or maxUnavailable: 1
  selector:
    matchLabels:
      app: my-app
```

### 3.4 Configure Horizontal Pod Autoscaler

**Impact: HIGH (auto-scaling)**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 3.5 Define Network Policies

**Impact: HIGH (security, isolation)**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-app-network-policy
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
```

### 3.6 Use ConfigMaps for Configuration

**Impact: MEDIUM (separation of concerns)**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
data:
  APP_ENV: "production"
  LOG_LEVEL: "info"
  CACHE_TTL: "3600"

---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: my-app
        envFrom:
        - configMapRef:
            name: my-app-config
```

### 3.7 Organize with Namespaces

**Impact: MEDIUM (organization, RBAC)**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    team: backend

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
```

### 3.8 Use Helm for Templating

**Impact: MEDIUM (reusability)**

```yaml
# values.yaml
replicaCount: 3
image:
  repository: myapp
  tag: "1.0.0"
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"

# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        resources:
          {{- toYaml .Values.resources | nindent 12 }}
```

---

## 4. Deployment Strategies

**Impact: HIGH**

Choose the right strategy for your risk tolerance and requirements.

### 4.1 Rolling Updates (Default)

**Impact: HIGH (zero-downtime, gradual)**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max pods above desired count during update
      maxUnavailable: 0  # Ensure no downtime
```

### 4.2 Blue-Green Deployment

**Impact: HIGH (instant rollback)**

```yaml
# blue-deployment.yaml (current production)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-blue
  labels:
    version: blue
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: my-app
        version: blue

---
# green-deployment.yaml (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-green
  labels:
    version: green
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: my-app
        version: green

---
# service.yaml - switch selector to deploy
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
    version: blue  # Change to 'green' to switch
```

### 4.3 Canary Deployment

**Impact: HIGH (risk mitigation)**

```yaml
# Using Istio for traffic splitting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: stable
      weight: 90
    - destination:
        host: my-app
        subset: canary
      weight: 10  # 10% traffic to canary

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
spec:
  host: my-app
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
```

### 4.4 Feature Flags for Progressive Delivery

**Impact: MEDIUM (fine-grained control)**

```typescript
// Using LaunchDarkly or similar
import * as LaunchDarkly from 'launchdarkly-node-server-sdk';

const ldClient = LaunchDarkly.init(process.env.LD_SDK_KEY);

async function handleRequest(user: User) {
  const showNewFeature = await ldClient.variation(
    'new-checkout-flow',
    { key: user.id, email: user.email },
    false  // default value
  );

  if (showNewFeature) {
    return renderNewCheckout();
  }
  return renderLegacyCheckout();
}
```

### 4.5 Graceful Shutdown

**Impact: HIGH (prevents dropped requests)**

```yaml
# Kubernetes deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: my-app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

```javascript
// Node.js graceful shutdown
const server = app.listen(3000);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, starting graceful shutdown');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    db.close();
    
    // Close Redis
    redis.quit();
    
    process.exit(0);
  });

  // Force close after 25s
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 25000);
});
```

---

## 5. Frontend Deployment

**Impact: HIGH**

Frontend-specific patterns for static assets and SPAs.

### 5.1 Deploy to Static Hosting

**Impact: HIGH (CDN, global distribution)**

```yaml
# Vercel - vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "regions": ["sfo1", "iad1", "cdg1"],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

```yaml
# AWS S3 + CloudFront via Terraform
resource "aws_s3_bucket" "frontend" {
  bucket = "my-app-frontend"
}

resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3Origin"
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"
    
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }
}
```

### 5.2 Configure CDN Caching Headers

**Impact: HIGH (performance)**

```javascript
// vite.config.js - content hashing
export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
}
```

```nginx
# nginx.conf
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location / {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    try_files $uri $uri/ /index.html;
}
```

### 5.3 Code Splitting for Lazy Loading

**Impact: HIGH (faster initial load)**

```javascript
// React lazy loading
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

```javascript
// Vite manual chunks
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts', 'd3'],
          'editor': ['monaco-editor']
        }
      }
    }
  }
}
```

### 5.4 Environment Variables at Build Time

**Impact: MEDIUM (configuration management)**

```bash
# .env.production
VITE_API_URL=https://api.production.com
VITE_ANALYTICS_ID=UA-XXXXX
```

```yaml
# GitHub Actions
- name: Build Frontend
  env:
    VITE_API_URL: ${{ secrets.API_URL }}
    VITE_ANALYTICS_ID: ${{ secrets.ANALYTICS_ID }}
  run: npm run build
```

```javascript
// Runtime config for dynamic values
// public/config.js (loaded at runtime)
window.APP_CONFIG = {
  API_URL: "__API_URL__",
  FEATURE_FLAGS: "__FEATURE_FLAGS__"
};

// Replace at container startup
// docker-entrypoint.sh
envsubst < /app/public/config.template.js > /app/public/config.js
```

### 5.5 Preview Deployments per PR

**Impact: HIGH (review, testing)**

```yaml
# Vercel automatically creates preview deployments
# Or manually with GitHub Actions:
- name: Deploy Preview
  if: github.event_name == 'pull_request'
  run: |
    vercel --token=${{ secrets.VERCEL_TOKEN }} \
      --scope=my-team \
      --confirm
```

```yaml
# Add comment with preview URL
- name: Comment Preview URL
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '🚀 Preview: ${{ steps.deploy.outputs.url }}'
      })
```

### 5.6 Lighthouse CI in Pipeline

**Impact: MEDIUM (performance monitoring)**

```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      ${{ steps.deploy.outputs.url }}
    budgetPath: ./lighthouse-budget.json
    uploadArtifacts: true

# lighthouse-budget.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }]
      }
    }
  }
}
```

### 5.7 Bundle Analysis

**Impact: MEDIUM (optimization)**

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "analyze": "vite build --mode analyze"
  }
}
```

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ]
}
```

---

## 6. Secrets Management

**Impact: MEDIUM-HIGH**

Protect sensitive data throughout the deployment pipeline.

### 6.1 Use External Secret Managers

**Impact: HIGH (centralized, auditable)**

```yaml
# External Secrets Operator with AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: my-app/prod/database
      property: url
  - secretKey: API_KEY
    remoteRef:
      key: my-app/prod/api-keys
      property: main
```

### 6.2 Implement Secret Rotation

**Impact: HIGH (security hygiene)**

```yaml
# AWS Secrets Manager rotation
resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

### 6.3 Encrypt Secrets at Rest

**Impact: HIGH (data protection)**

```yaml
# Kubernetes EncryptionConfiguration
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-key>
      - identity: {}
```

### 6.4 Avoid Secrets in Environment Variables

**Impact: MEDIUM (reduces exposure)**

**Incorrect:**

```yaml
containers:
- name: my-app
  env:
  - name: DATABASE_PASSWORD
    value: "super-secret"  # Visible in pod spec!
```

**Correct:**

```yaml
containers:
- name: my-app
  env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password
  # Or mount as file
  volumeMounts:
  - name: secrets
    mountPath: /etc/secrets
    readOnly: true
volumes:
- name: secrets
  secret:
    secretName: db-credentials
```

### 6.5 Enable Audit Logging

**Impact: MEDIUM (compliance, forensics)**

```yaml
# Kubernetes audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

---

## 7. Infrastructure as Code

**Impact: MEDIUM**

Manage infrastructure with version-controlled code.

### 7.1 Use Terraform for Infrastructure

**Impact: HIGH (reproducibility)**

```hcl
# main.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_eks_cluster" "main" {
  name     = "my-cluster"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids = module.vpc.private_subnets
  }
}
```

### 7.2 Store State Remotely with Locking

**Impact: HIGH (team collaboration)**

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### 7.3 Create Reusable Modules

**Impact: MEDIUM (DRY principle)**

```hcl
# modules/eks-cluster/main.tf
variable "cluster_name" {}
variable "kubernetes_version" {}
variable "vpc_id" {}

resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  version  = var.kubernetes_version
  # ...
}

# environments/production/main.tf
module "eks" {
  source = "../../modules/eks-cluster"
  
  cluster_name       = "production"
  kubernetes_version = "1.29"
  vpc_id            = module.vpc.vpc_id
}
```

### 7.4 Validate Before Apply

**Impact: MEDIUM (prevent errors)**

```yaml
# CI pipeline
- name: Terraform Validate
  run: |
    terraform init -backend=false
    terraform validate
    terraform fmt -check
    
- name: Terraform Plan
  run: terraform plan -out=tfplan
  
- name: Apply (manual approval)
  if: github.ref == 'refs/heads/main'
  run: terraform apply -auto-approve tfplan
```

### 7.5 Detect Configuration Drift

**Impact: MEDIUM (consistency)**

```yaml
# Scheduled drift detection
name: Drift Detection
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
    - name: Terraform Plan
      run: terraform plan -detailed-exitcode
      continue-on-error: true
    
    - name: Alert on Drift
      if: failure()
      run: |
        curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -d '{"text":"⚠️ Infrastructure drift detected!"}'
```

---

## 8. Monitoring & Logging

**Impact: MEDIUM**

Visibility into system health and behavior.

### 8.1 Structured JSON Logging

**Impact: HIGH (searchable, parseable)**

```javascript
// Node.js with Pino
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  base: {
    service: 'my-app',
    version: process.env.APP_VERSION
  }
});

logger.info({ orderId: '12345', userId: 'user-1' }, 'Order created');
// {"level":"info","service":"my-app","orderId":"12345","userId":"user-1","msg":"Order created"}
```

### 8.2 Trace ID Correlation

**Impact: HIGH (distributed tracing)**

```javascript
// Express middleware
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] || uuidv4();
  res.setHeader('x-trace-id', traceId);
  
  asyncLocalStorage.run({ traceId }, () => {
    next();
  });
});

// Logger automatically includes traceId
const getTraceId = () => asyncLocalStorage.getStore()?.traceId;
```

### 8.3 Export Prometheus Metrics

**Impact: MEDIUM (monitoring)**

```javascript
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry });

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry]
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});
```

### 8.4 Define Actionable Alerts

**Impact: HIGH (incident response)**

```yaml
# Prometheus alerting rules
groups:
- name: my-app
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m])) /
      sum(rate(http_requests_total[5m])) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"

  - alert: HighLatency
    expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
    for: 10m
    labels:
      severity: warning
```

### 8.5 Operational Dashboards

**Impact: MEDIUM (visibility)**

```json
// Grafana dashboard JSON (simplified)
{
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [{
        "expr": "sum(rate(http_requests_total[5m]))"
      }]
    },
    {
      "title": "Error Rate",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(http_requests_total{status=~'5..'}[5m])) / sum(rate(http_requests_total[5m]))"
      }]
    },
    {
      "title": "P95 Latency",
      "type": "gauge",
      "targets": [{
        "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
      }]
    }
  ]
}
```

---

## 9. Security & Compliance

**Impact: MEDIUM**

Protect against vulnerabilities and meet compliance requirements.

### 9.1 Scan Images for Vulnerabilities

**Impact: HIGH (shift-left security)**

```yaml
- name: Scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'myapp:${{ github.sha }}'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'

- name: Upload to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

### 9.2 Implement RBAC

**Impact: HIGH (least privilege)**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-deployer
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: github-actions
  namespace: production
roleRef:
  kind: Role
  name: app-deployer
  apiGroup: rbac.authorization.k8s.io
```

### 9.3 Apply Pod Security Standards

**Impact: HIGH (container security)**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 9.4 Verify Image Provenance

**Impact: MEDIUM (supply chain security)**

```yaml
# Sigstore/Cosign signing
- name: Sign image
  run: |
    cosign sign --key env://COSIGN_PRIVATE_KEY \
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

# Verification policy
apiVersion: policy.sigstore.dev/v1alpha1
kind: ClusterImagePolicy
metadata:
  name: verify-signatures
spec:
  images:
  - glob: "ghcr.io/my-org/**"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        ...
        -----END PUBLIC KEY-----
```

### 9.5 Automate Compliance Checks

**Impact: MEDIUM (audit readiness)**

```yaml
# Open Policy Agent (OPA) policy
package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Deployment"
  container := input.request.object.spec.template.spec.containers[_]
  not container.securityContext.runAsNonRoot
  msg := "Containers must run as non-root"
}

deny[msg] {
  input.request.kind.kind == "Deployment"
  container := input.request.object.spec.template.spec.containers[_]
  not container.resources.limits
  msg := "Containers must have resource limits"
}
```

### 9.6 Enable Audit Logging

**Impact: MEDIUM (compliance, forensics)**

```yaml
# EKS audit logging
resource "aws_eks_cluster" "main" {
  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]
}
```

---

## References

- [Docker Official Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [OWASP DevSecOps Guideline](https://owasp.org/www-project-devsecops-guideline/)
