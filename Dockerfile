# Use Node.js 18 LTS Alpine for smaller image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for build
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build the Next.js app
RUN npm run build

# ===============================
# Production image
# ===============================
FROM node:18-alpine AS runner

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nextgroup
RUN adduser -S nextuser -u 1001
USER nextuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const req=http.request({hostname:'localhost',port:3000,path:'/api/health'},res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.end();"

# Start the Next.js app
CMD ["npm", "start"]
