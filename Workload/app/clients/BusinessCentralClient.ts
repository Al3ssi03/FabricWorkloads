
/**
 * Business Central OData API Client Configuration
 */
export interface BCConnectionConfig {
  /** Azure AD Tenant ID for OAuth authentication */
  tenantId: string;
  /** Azure AD Client ID (App Registration) */
  clientId: string;
  /** Azure AD Client Secret (retrieved from Key Vault) */
  clientSecret: string;
  /** BC Environment name (Production, Sandbox, etc.) */
  environment: string;
}

/**
 * OData response wrapper with pagination support
 */
export interface ODataResponse<T> {
  "@odata.context": string;
  "@odata.nextLink"?: string;
  value: T[];
}

/**
 * Business Central Customer entity (OData V4)
 */
export interface BCCustomer {
  id: string;
  number: string;
  displayName: string;
  type?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    countryLetterCode?: string;
    postalCode?: string;
  };
  phoneNumber?: string;
  email?: string;
  website?: string;
  taxLiable?: boolean;
  taxAreaId?: string;
  taxAreaDisplayName?: string;
  taxRegistrationNumber?: string;
  currencyCode?: string;
  paymentTermsId?: string;
  shipmentMethodId?: string;
  paymentMethodId?: string;
  blocked?: string;
  lastModifiedDateTime?: string;
}

/**
 * Generic Business Central OData entity
 */
export interface BCEntity {
  [key: string]: any;
}

/**
 * Business Central OData API Client
 * Handles OAuth 2.0 authentication and OData V4 queries
 * Supports multi-company scenarios
 */
export class BusinessCentralClient {
  private config: BCConnectionConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl: string;

  constructor(config: BCConnectionConfig) {
    this.config = config;
    // Build BC API base URL from tenant and environment
    this.baseUrl = `https://api.businesscentral.dynamics.com/v2.0/${config.tenantId}/${config.environment}/ODataV4/`;
  }

  /**
   * Get OAuth 2.0 access token using client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://api.businesscentral.dynamics.com/.default',
      grant_type: 'client_credentials'
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth token request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get BC access token:', error);
      throw new Error(`BC Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the full OData endpoint URL for a specific company
   */
  private buildEndpoint(companyName: string, entitySet: string, query?: string): string {
    let url = this.baseUrl;

    // Add company
    url += `Company('${encodeURIComponent(companyName)}')/`;

    // Add entity set
    url += entitySet;

    // Add query parameters
    if (query) {
      url += `?${query}`;
    }

    return url;
  }

  /**
   * Execute OData GET request
   */
  private async executeODataRequest<T>(url: string): Promise<ODataResponse<T>> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OData request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OData request failed:', error);
      throw new Error(`BC OData request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all customers for a specific company with automatic pagination
   */
  async getAllCustomers(companyName: string, filter?: string, select?: string[]): Promise<BCCustomer[]> {
    const queryParams: string[] = [];

    if (filter) {
      queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    }

    if (select && select.length > 0) {
      queryParams.push(`$select=${select.join(',')}`);
    }

    // Add top parameter for pagination
    queryParams.push('$top=100');

    const query = queryParams.join('&');
    const endpoint = this.buildEndpoint(companyName, 'customers', query);

    return this.getAllPaginated<BCCustomer>(endpoint);
  }

  /**
   * Get customers for multiple companies
   */
  async getAllCustomersMultiCompany(companies: string[], filter?: string, select?: string[]): Promise<Map<string, BCCustomer[]>> {
    const results = new Map<string, BCCustomer[]>();

    for (const company of companies) {
      try {
        const customers = await this.getAllCustomers(company, filter, select);
        results.set(company, customers);
      } catch (error) {
        console.error(`Failed to fetch customers for company ${company}:`, error);
        results.set(company, []);
      }
    }

    return results;
  }

  /**
   * Generic method to query any OData entity for a specific company
   */
  async queryEntity<T = BCEntity>(companyName: string, entitySet: string, odataQuery?: string): Promise<T[]> {
    const endpoint = this.buildEndpoint(companyName, entitySet, odataQuery);
    return this.getAllPaginated<T>(endpoint);
  }

  /**
   * Handle OData pagination automatically
   */
  private async getAllPaginated<T>(initialUrl: string): Promise<T[]> {
    const allResults: T[] = [];
    let nextUrl: string | undefined = initialUrl;

    while (nextUrl) {
      const response = await this.executeODataRequest<T>(nextUrl);

      // Add current page results
      allResults.push(...response.value);

      // Check for next page
      nextUrl = response['@odata.nextLink'];
    }

    return allResults;
  }

  /**
   * Test connection to Business Central for a specific company
   */
  async testConnection(companyName?: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Try to get access token
      const token = await this.getAccessToken();

      if (!token) {
        return {
          success: false,
          message: 'Failed to obtain access token'
        };
      }

      // If no company specified, just test auth
      if (!companyName) {
        return {
          success: true,
          message: 'Successfully authenticated with Business Central API'
        };
      }

      // Try to fetch a small amount of data from the company
      const endpoint = this.buildEndpoint(companyName, 'customers', '$top=1');
      const response = await this.executeODataRequest<BCCustomer>(endpoint);

      return {
        success: true,
        message: `Successfully connected to Business Central company: ${companyName}`,
        details: {
          environment: this.config.environment,
          company: companyName,
          recordsFetched: response.value.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * List all available companies in the BC environment
   */
  async getCompanies(): Promise<{ id: string; name: string; displayName: string }[]> {
    try {
      const token = await this.getAccessToken();
      const companiesUrl = `${this.baseUrl}companies?$select=id,name,displayName`;

      const response = await fetch(companiesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.status}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Failed to get companies:', error);
      return [];
    }
  }

  /**
   * Get list of available OData entities for a company by parsing $metadata
   */
  async getAvailableEntities(companyName: string): Promise<{ name: string; displayName: string }[]> {
    try {
      const token = await this.getAccessToken();

      // Build metadata URL for the company
      const metadataUrl = `${this.baseUrl}Company('${encodeURIComponent(companyName)}')/$metadata`;

      const response = await fetch(metadataUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/xml'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }

      const metadataXml = await response.text();

      // Parse XML to extract entity sets
      const entities = this.parseEntitySetsFromMetadata(metadataXml);
      return entities;
    } catch (error) {
      console.error('Failed to get available entities:', error);
      return [];
    }
  }

  /**
   * Parse entity sets from OData $metadata XML
   */
  private parseEntitySetsFromMetadata(metadataXml: string): { name: string; displayName: string }[] {
    const entities: { name: string; displayName: string }[] = [];

    try {
      // Simple regex parsing to extract EntitySet names
      const entitySetRegex = /<EntitySet\s+Name="([^"]+)"\s+EntityType="[^"]+"/g;
      let match;

      while ((match = entitySetRegex.exec(metadataXml)) !== null) {
        const entityName = match[1];

        // Filter out system entities and include common business entities
        if (!entityName.startsWith('Microsoft.') &&
            !entityName.startsWith('NAV.') &&
            !entityName.includes('$') &&
            entityName !== 'companies') {

          // Convert camelCase to Display Name
          const displayName = entityName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();

          entities.push({
            name: entityName,
            displayName: displayName || entityName
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse metadata:', error);
    }

    // Sort alphabetically
    return entities.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Get data from any entity with generic typing
   */
  async getEntityData<T = BCEntity>(
    companyName: string,
    entityName: string,
    filter?: string,
    select?: string[],
    top?: number
  ): Promise<T[]> {
    const queryParams: string[] = [];

    if (filter) {
      queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    }

    if (select && select.length > 0) {
      queryParams.push(`$select=${select.join(',')}`);
    }

    if (top) {
      queryParams.push(`$top=${top}`);
    } else {
      // Default pagination
      queryParams.push('$top=100');
    }

    const query = queryParams.join('&');
    const endpoint = this.buildEndpoint(companyName, entityName, query);

    return this.getAllPaginated<T>(endpoint);
  }
}

/**
 * Helper to retrieve secret from Azure Key Vault
 * This should be called before creating BusinessCentralClient
 */
export async function getSecretFromKeyVault(keyVaultUrl: string, accessToken: string): Promise<string> {
  try {
    // Extract vault name and secret name from URL
    // Format: https://{vault-name}.vault.azure.net/secrets/{secret-name}
    const secretUrl = `${keyVaultUrl}?api-version=7.4`;

    const response = await fetch(secretUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Key Vault request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Failed to retrieve secret from Key Vault:', error);
    throw new Error(`Key Vault access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
