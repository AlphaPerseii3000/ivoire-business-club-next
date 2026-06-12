export const selectors = {
  auth: {
    nameInput: '[data-testid="name-input"]',
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    signinButton: '[data-testid="signin-button"]',
    signupButton: '[data-testid="signup-button"]',
    googleButton: '[data-testid="google-oauth-button"]',
    authError: '[data-testid="auth-error"]',
  },
  nav: {
    dashboard: '[data-testid="nav-dashboard"]',
    profile: '[data-testid="nav-profile"]',
    admin: '[data-testid="nav-admin"]',
  },
  pricing: {
    grid: '[data-testid="pricing-tier-grid"]',
    tierCard: '[data-testid="tier-card"]',
    affranchiCard: '[data-testid="tier-card"][data-tier="affranchi"]',
    grandFrereCard: '[data-testid="tier-card"][data-tier="grandfrere"]',
    bossCard: '[data-testid="tier-card"][data-tier="boss"]',
    continueButton: '[data-testid="pricing-continue-button"]',
  },
  bankTransfer: {
    instructions: '[data-testid="bank-transfer-instructions"]',
    beneficiary: '[data-testid="transfer-beneficiary"]',
    amount: '[data-testid="transfer-amount"]',
    reference: '[data-testid="transfer-reference"]',
    confirmButton: '[data-testid="transfer-confirm-button"]',
    confirmation: '[data-testid="transfer-confirmation"]',
  },
  dashboard: {
    root: '[data-testid="dashboard-page"]',
    userName: '[data-testid="dashboard-user-name"]',
    tier: '[data-testid="dashboard-tier"]',
    subscriptionStatus: '[data-testid="dashboard-subscription-status"]',
  },
  opportunities: {
    card: '[data-testid="opportunity-card"]',
    title: '[data-testid="opportunity-title"]',
    newForm: '[data-testid="opportunity-form"]',
    titleInput: '[data-testid="opportunity-title-input"]',
    amountInput: '[data-testid="opportunity-amount-input"]',
    descriptionInput: '[data-testid="opportunity-description-input"]',
    submitButton: '[data-testid="opportunity-submit-button"]',
    verifyButton: '[data-testid="opportunity-verify-btn"]',
    rejectButton: '[data-testid="opportunity-reject-btn"]',
    status: '[data-testid="opportunity-status"]',
    tierGate: '[data-testid="opportunity-tier-gate"]',
  },
  documents: {
    section: '[data-testid="documents-section"]',
    uploadInput: '[data-testid="document-upload-input"]',
    uploadButton: '[data-testid="document-upload-button"]',
    row: '[data-testid="document-row"]',
    hiddenMetadata: '[data-testid="documents-hidden-metadata"]',
  },
  premium: {
    blockedPanel: '[data-testid="premium-blocked-panel"]',
    upgradeCta: '[data-testid="upgrade-cta"]',
  },
} as const;

export type SelectorKey = typeof selectors;
