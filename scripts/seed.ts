import { db } from "../src/lib/db";
import { programs, assets, features, endpoints, evidence, hypotheses, researchSessions, testObservations, reports, aiRuns } from "../src/lib/db/schema";
import { randomUUID } from "crypto";

async function seed() {
  console.log("🌱 Seeding database with fictional demo data...");

  // Clear existing data (in order of dependencies)
  await db.delete(aiRuns);
  await db.delete(reports);
  await db.delete(testObservations);
  await db.delete(researchSessions);
  await db.delete(hypotheses);
  await db.delete(evidence);
  await db.delete(endpoints);
  await db.delete(features);
  await db.delete(assets);
  await db.delete(programs);

  // Create fictional programs
  const program1Id = randomUUID();
  const program2Id = randomUUID();
  const program3Id = randomUUID();

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await db.insert(programs).values([
    {
      id: program1Id,
      name: "ExampleCorp Bug Bounty",
      platform: "Intigriti",
      programUrl: "https://intigriti.com/programs/examplecorp",
      policyText: `[DEMO DATA] ExampleCorp Bug Bounty Program Policy

IN SCOPE:
- *.examplecorp.com
- api.examplecorp.com
- admin.examplecorp.com
- Mobile apps (iOS/Android)

OUT OF SCOPE:
- Third-party services (CDN, email providers)
- Social engineering attacks
- Physical security tests
- DoS/DDoS attacks

ALLOWED TESTING:
- Authentication bypass attempts
- Authorization testing
- Input validation testing
- Business logic flaws

REWARDS:
- Critical: $5,000 - $15,000
- High: $1,000 - $5,000
- Medium: $250 - $1,000
- Low: $50 - $250`,
      policyReviewedAt: lastWeek,
      researchStatus: "active_research",
      evaluationScoresJson: JSON.stringify({
        attackSurfaceUsefulness: 4,
        scopeClarity: 5,
        rewardSuitability: 4,
        productComplexity: 3,
        researchOpportunity: 4,
        skillFit: 4,
      }),
      notes: "Primary target for Q1. Good scope clarity and rewards. API looks interesting.",
      createdAt: lastWeek,
      updatedAt: yesterday,
    },
    {
      id: program2Id,
      name: "FinTech Solutions VDP",
      platform: "HackerOne",
      programUrl: "https://hackerone.com/fintech-solutions",
      policyText: `[DEMO DATA] FinTech Solutions Vulnerability Disclosure Program

IN SCOPE:
- app.fintech-solutions.io
- api.fintech-solutions.io
- Web banking portal

OUT OF SCOPE:
- Infrastructure (AWS, Cloudflare)
- Employee systems
- Third-party integrations

ALLOWED TESTING:
- IDOR testing
- Authorization bypass
- XSS/CSRF
- API security

REWARDS:
- Critical: $10,000+
- High: $3,000 - $10,000
- Medium: $500 - $3,000
- Low: $100 - $500`,
      policyReviewedAt: yesterday,
      researchStatus: "evaluating",
      evaluationScoresJson: JSON.stringify({
        attackSurfaceUsefulness: 5,
        scopeClarity: 3,
        rewardSuitability: 5,
        productComplexity: 5,
        researchOpportunity: 5,
        skillFit: 3,
      }),
      notes: "High rewards but complex fintech app. Need to brush up on financial regulations.",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: program3Id,
      name: "OpenSource Project VDP",
      platform: "GitHub Security",
      programUrl: "https://github.com/opensource-project/security",
      policyText: `[DEMO DATA] OpenSource Project Security Policy

IN SCOPE:
- Core application (GitHub repository)
- CI/CD pipelines
- Documentation site
- Package registry

OUT OF SCOPE:
- Dependencies (report upstream)
- GitHub platform itself
- Social engineering

ALLOWED TESTING:
- Supply chain attacks
- CI/CD vulnerabilities
- Code injection
- Access control

REWARDS:
- No monetary rewards (swag only)
- Public acknowledgment
- Hall of fame`,
      policyReviewedAt: now,
      researchStatus: "inbox",
      evaluationScoresJson: JSON.stringify({
        attackSurfaceUsefulness: 2,
        scopeClarity: 4,
        rewardSuitability: 1,
        productComplexity: 2,
        researchOpportunity: 3,
        skillFit: 5,
      }),
      notes: "No monetary rewards but good for learning and portfolio. Low priority.",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Create assets
  const asset1Id = randomUUID();
  const asset2Id = randomUUID();
  const asset3Id = randomUUID();
  const asset4Id = randomUUID();

  await db.insert(assets).values([
    {
      id: asset1Id,
      programId: program1Id,
      assetIdentifier: "api.examplecorp.com",
      assetType: "API",
      scopeStatus: "in_scope",
      restrictionsJson: JSON.stringify({ rateLimit: "100 req/min", authRequired: true }),
      notes: "Main API endpoint",
    },
    {
      id: asset2Id,
      programId: program1Id,
      assetIdentifier: "admin.examplecorp.com",
      assetType: "Web Application",
      scopeStatus: "in_scope",
      restrictionsJson: JSON.stringify({ authRequired: true, adminOnly: true }),
      notes: "Admin panel",
    },
    {
      id: asset3Id,
      programId: program2Id,
      assetIdentifier: "api.fintech-solutions.io",
      assetType: "API",
      scopeStatus: "in_scope",
      restrictionsJson: JSON.stringify({ rateLimit: "60 req/min", authRequired: true, mfaRequired: true }),
      notes: "Banking API",
    },
    {
      id: asset4Id,
      programId: program3Id,
      assetIdentifier: "github.com/opensource-project",
      assetType: "Source Code Repository",
      scopeStatus: "in_scope",
      restrictionsJson: JSON.stringify({}),
      notes: "Main repository",
    },
  ]);

  // Create features
  const feature1Id = randomUUID();
  const feature2Id = randomUUID();
  const feature3Id = randomUUID();
  const feature4Id = randomUUID();

  await db.insert(features).values([
    {
      id: feature1Id,
      programId: program1Id,
      assetId: asset1Id,
      name: "User Management API",
      description: "CRUD operations for user accounts, roles, and permissions",
      rolesJson: JSON.stringify(["user", "admin", "super_admin"]),
      resourceTypesJson: JSON.stringify(["user", "role", "permission"]),
      expectedSecurityPropertiesJson: JSON.stringify(["Users can only access own data", "Admins cannot escalate to super_admin", "Role changes require MFA"]),
      notes: "Core user management functionality",
    },
    {
      id: feature2Id,
      programId: program1Id,
      assetId: asset2Id,
      name: "Admin Dashboard",
      description: "Administrative interface for managing users, settings, and reports",
      rolesJson: JSON.stringify(["admin", "super_admin"]),
      resourceTypesJson: JSON.stringify(["user", "settings", "report", "audit_log"]),
      expectedSecurityPropertiesJson: JSON.stringify(["Admins cannot access super_admin functions", "Audit logs are immutable", "Settings changes require confirmation"]),
      notes: "High-value target for privilege escalation",
    },
    {
      id: feature3Id,
      programId: program2Id,
      assetId: asset3Id,
      name: "Fund Transfer API",
      description: "API for transferring funds between accounts",
      rolesJson: JSON.stringify(["user", "premium_user"]),
      resourceTypesJson: JSON.stringify(["account", "transaction", "beneficiary"]),
      expectedSecurityPropertiesJson: JSON.stringify(["Users can only transfer from own accounts", "Daily limits enforced", "MFA required for large transfers", "Beneficiary verification required"]),
      notes: "Critical financial functionality",
    },
    {
      id: feature4Id,
      programId: program3Id,
      assetId: asset4Id,
      name: "CI/CD Pipeline",
      description: "GitHub Actions workflows for build, test, and deploy",
      rolesJson: JSON.stringify(["maintainer", "contributor"]),
      resourceTypesJson: JSON.stringify(["workflow", "secret", "artifact", "deployment"]),
      expectedSecurityPropertiesJson: JSON.stringify(["Secrets not exposed in logs", "Contributors cannot modify workflows", "Deployments require approval"]),
      notes: "Supply chain attack surface",
    },
  ]);

  // Create endpoints
  await db.insert(endpoints).values([
    {
      id: randomUUID(),
      programId: program1Id,
      assetId: asset1Id,
      featureId: feature1Id,
      method: "GET",
      pathTemplate: "/api/v1/users/{userId}",
      purpose: "Get user profile",
      authenticationRequirement: "Bearer token",
      expectedAuthorization: "User can only access own profile",
      testStatus: "untested",
      notes: "Potential IDOR if userId not validated",
    },
    {
      id: randomUUID(),
      programId: program1Id,
      assetId: asset1Id,
      featureId: feature1Id,
      method: "PUT",
      pathTemplate: "/api/v1/users/{userId}/role",
      purpose: "Update user role",
      authenticationRequirement: "Bearer token (admin)",
      expectedAuthorization: "Only super_admin can assign admin role",
      testStatus: "untested",
      notes: "Privilege escalation risk",
    },
    {
      id: randomUUID(),
      programId: program1Id,
      assetId: asset2Id,
      featureId: feature2Id,
      method: "GET",
      pathTemplate: "/admin/users",
      purpose: "List all users",
      authenticationRequirement: "Bearer token (admin)",
      expectedAuthorization: "Admin access only",
      testStatus: "untested",
      notes: "Check for pagination bypass",
    },
    {
      id: randomUUID(),
      programId: program2Id,
      assetId: asset3Id,
      featureId: feature3Id,
      method: "POST",
      pathTemplate: "/api/v1/transfers",
      purpose: "Initiate fund transfer",
      authenticationRequirement: "Bearer token + MFA",
      expectedAuthorization: "User can only transfer from own accounts",
      testStatus: "untested",
      notes: "Check for race conditions",
    },
    {
      id: randomUUID(),
      programId: program3Id,
      assetId: asset4Id,
      featureId: feature4Id,
      method: "GET",
      pathTemplate: "/actions/workflows",
      purpose: "List workflows",
      authenticationRequirement: "GitHub token",
      expectedAuthorization: "Repository access required",
      testStatus: "untested",
      notes: "Check for secret leakage in logs",
    },
  ]);

  // Create evidence
  const evidence1Id = randomUUID();
  const evidence2Id = randomUUID();
  const evidence3Id = randomUUID();

  await db.insert(evidence).values([
    {
      id: evidence1Id,
      programId: program1Id,
      evidenceType: "program_policy",
      title: "ExampleCorp Program Policy",
      content: "Full policy text from Intigriti program page",
      sourceUrl: "https://intigriti.com/programs/examplecorp",
      collectedAt: lastWeek,
      verificationStatus: "verified",
      contentHash: "abc123",
      metadataJson: JSON.stringify({ source: "Intigriti", retrievedAt: lastWeek.toISOString() }),
    },
    {
      id: evidence2Id,
      programId: program1Id,
      evidenceType: "endpoint_observation",
      title: "User profile endpoint returns data",
      content: "Observed: GET /api/v1/users/123 returns user profile with email, name, role. No authorization check visible in response headers.",
      sourceUrl: "https://api.examplecorp.com/api/v1/users/123",
      collectedAt: yesterday,
      verificationStatus: "verified",
      contentHash: "def456",
      metadataJson: JSON.stringify({ method: "GET", statusCode: 200, testedWith: "test_account_1" }),
    },
    {
      id: evidence3Id,
      programId: program1Id,
      evidenceType: "technology_observation",
      title: "API uses JWT for authentication",
      content: "Observed: Authorization header uses JWT tokens. Tokens contain user_id and role claims. No obvious token validation errors.",
      collectedAt: yesterday,
      verificationStatus: "unverified",
      contentHash: "ghi789",
      metadataJson: JSON.stringify({ tech: "JWT", algorithm: "RS256" }),
    },
  ]);

  // Create hypotheses
  const hypothesis1Id = randomUUID();
  const hypothesis2Id = randomUUID();

  await db.insert(hypotheses).values([
    {
      id: hypothesis1Id,
      programId: program1Id,
      featureId: feature1Id,
      title: "IDOR on User Profile Endpoint",
      statement: "The API endpoint GET /api/v1/users/{userId} may not validate that the authenticated user matches the requested userId, allowing horizontal privilege escalation.",
      category: "IDOR / Broken Access Control",
      supportingEvidenceJson: JSON.stringify([evidence2Id]),
      contradictingEvidenceJson: JSON.stringify([]),
      assumptionsJson: JSON.stringify(["Endpoint accepts userId parameter directly", "No additional authorization header checks"]),
      prerequisitesJson: JSON.stringify(["Two test accounts with different userIds", "Valid JWT tokens for both accounts"]),
      testPlan: "1. Login with test_account_1, get JWT token\n2. Request GET /api/v1/users/{test_account_2_id} with test_account_1 token\n3. Observe if response contains test_account_2 data\n4. Repeat reverse direction",
      expectedVulnerableResult: "Response returns test_account_2's profile data (email, name, role)",
      expectedSafeResult: "Response returns 403 Forbidden or 404 Not Found",
      potentialImpact: "Horizontal privilege escalation - access to other users' PII",
      status: "ready_for_review",
      priorityScore: 8.5,
      priorityBreakdownJson: JSON.stringify({ evidenceStrength: 4, potentialImpact: 4, featureRelevance: 5, informationGain: 4, investigationCost: 2, testingRisk: 1 }),
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: hypothesis2Id,
      programId: program1Id,
      featureId: feature2Id,
      title: "Admin Role Escalation via PUT /users/{userId}/role",
      statement: "The role update endpoint may not properly validate that the requester has super_admin privileges, allowing admin users to escalate to super_admin.",
      category: "Privilege Escalation",
      supportingEvidenceJson: JSON.stringify([]),
      contradictingEvidenceJson: JSON.stringify([]),
      assumptionsJson: JSON.stringify(["Endpoint accepts role parameter", "Admin token can be obtained", "Role validation only checks for admin, not super_admin"]),
      prerequisitesJson: JSON.stringify(["Admin test account", "Target user to escalate", "Valid admin JWT token"]),
      testPlan: "1. Login as admin user\n2. Send PUT /api/v1/users/{target_id}/role with role=super_admin\n3. Check if role is updated\n4. Verify new permissions",
      expectedVulnerableResult: "Role updated to super_admin, new permissions granted",
      expectedSafeResult: "Response returns 403 Forbidden",
      potentialImpact: "Vertical privilege escalation - full system compromise",
      status: "draft",
      priorityScore: 7.2,
      priorityBreakdownJson: JSON.stringify({ evidenceStrength: 2, potentialImpact: 5, featureRelevance: 5, informationGain: 4, investigationCost: 3, testingRisk: 2 }),
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Create research session
  const session1Id = randomUUID();
  await db.insert(researchSessions).values({
    id: session1Id,
    programId: program1Id,
    hypothesisId: hypothesis1Id,
    objective: "Test IDOR hypothesis on user profile endpoint",
    sessionNotes: "Started testing with two accounts. Need to verify token format first.",
    handoffSummary: "Tested IDOR hypothesis. Confirmed endpoint returns 200 for cross-account requests. Need to verify data sensitivity.",
    nextStepsJson: JSON.stringify([
      { description: "Verify data returned in cross-account request", priority: 5, completed: false },
      { description: "Check if email/PII exposed", priority: 5, completed: false },
      { description: "Document findings for report", priority: 3, completed: false },
    ]),
    startedAt: lastWeek,
    endedAt: yesterday,
  });

  // Create test observation
  await db.insert(testObservations).values({
    id: randomUUID(),
    programId: program1Id,
    sessionId: session1Id,
    hypothesisId: hypothesis1Id,
    testDescription: "Cross-account request with test_account_1 token to test_account_2 profile",
    expectedResult: "403 Forbidden",
    actualResult: "200 OK with user profile data",
    evidenceIdsJson: JSON.stringify([evidence2Id]),
    conclusion: "supported",
    createdAt: yesterday,
  });

  console.log("✅ Database seeded successfully!");
  console.log(`Created 3 programs, 4 assets, 4 features, 5 endpoints, 3 evidence records, 2 hypotheses, 1 session, 1 test observation`);
  console.log("\nNote: All data is FICTIONAL and for demonstration purposes only.");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });