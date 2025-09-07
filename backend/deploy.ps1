# deploy.ps1
param(
    [string]$ServiceArn = "arn:aws:apprunner:ap-southeast-2:265295805896:service/skill-sync-claims-service/ff37799176364c90b7cee0ef5b2d6e8f"
)

# 1. Build a fresh image (force rebuild so no stale cache)
docker build --no-cache -t skill-sync-claims:latest .

# 2. Tag it for ECR
$ECR_URI = "265295805896.dkr.ecr.ap-southeast-2.amazonaws.com/skill-sync-claims:latest"
docker tag skill-sync-claims:latest $ECR_URI

# 3. Login to ECR
aws ecr get-login-password --region ap-southeast-2 `
| docker login --username AWS --password-stdin 265295805896.dkr.ecr.ap-southeast-2.amazonaws.com

# 4. Push to ECR
docker push $ECR_URI

# 5. Trigger a redeploy in App Runner
aws apprunner start-deployment --service-arn $ServiceArn

Write-Host "`n✅ Build, push, and redeploy triggered for $ServiceArn" -ForegroundColor Green
