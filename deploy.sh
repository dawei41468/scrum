#!/bin/bash

# Deployment script for Scrum App on Tencent Cloud Lighthouse

# Environment variables for Tencent Cloud Lighthouse
# Replace these with actual values before running the script
export SERVER_IP="YOUR_SERVER_IP"
export SERVER_USER="YOUR_SERVER_USER"
export SERVER_PASSWORD="YOUR_SERVER_PASSWORD"
export APP_NAME="scrum-app"
export APP_PORT="80"

# Local Docker image names
export BACKEND_IMAGE="scrum-backend"
export FRONTEND_IMAGE="scrum-frontend"
export MONGO_IMAGE="mongo:latest"

# Tag and push images to Tencent Cloud Container Registry (TCR)
# Ensure you have logged in to TCR using `docker login` with your Tencent Cloud credentials
export TCR_REGISTRY="ccr.ccs.tencentyun.com"
export TCR_NAMESPACE="YOUR_TCR_NAMESPACE"  # Replace with your TCR namespace
export BACKEND_IMAGE_TAGGED="${TCR_REGISTRY}/${TCR_NAMESPACE}/${BACKEND_IMAGE}:latest"
export FRONTEND_IMAGE_TAGGED="${TCR_REGISTRY}/${TCR_NAMESPACE}/${FRONTEND_IMAGE}:latest"
export MONGO_IMAGE_TAGGED="${TCR_REGISTRY}/${TCR_NAMESPACE}/${MONGO_IMAGE}:latest"

# Tag images
docker tag ${BACKEND_IMAGE} ${BACKEND_IMAGE_TAGGED}
docker tag ${FRONTEND_IMAGE} ${FRONTEND_IMAGE_TAGGED}
docker tag ${MONGO_IMAGE} ${MONGO_IMAGE_TAGGED}

# Push images to TCR
docker push ${BACKEND_IMAGE_TAGGED}
docker push ${FRONTEND_IMAGE_TAGGED}
docker push ${MONGO_IMAGE_TAGGED}

# SSH into Tencent Cloud Lighthouse and deploy
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << EOF
  # Install Docker and Docker Compose if not already installed
  sudo apt-get update
  sudo apt-get install -y docker.io docker-compose
  sudo systemctl start docker
  sudo systemctl enable docker

  # Login to TCR
  docker login -u YOUR_TCR_USERNAME -p YOUR_TCR_PASSWORD ${TCR_REGISTRY}

  # Create docker-compose.yml for production
  cat > docker-compose.yml << EOY
version: '3.8'
services:
  mongo:
    image: ${MONGO_IMAGE_TAGGED}
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example

  backend:
    image: ${BACKEND_IMAGE_TAGGED}
    restart: always
    depends_on:
      - mongo
    environment:
      - MONGODB_URI=mongodb://root:example@mongo:27017/scrum?authSource=admin
      - JWT_SECRET_KEY=your-secret-key
    ports:
      - "8000:8000"

  frontend:
    image: ${FRONTEND_IMAGE_TAGGED}
    restart: always
    depends_on:
      - backend
    ports:
      - "${APP_PORT}:80"

volumes:
  mongodb_data:
EOY

  # Deploy the application
  docker-compose up -d
EOF

echo "Deployment to Tencent Cloud Lighthouse completed."