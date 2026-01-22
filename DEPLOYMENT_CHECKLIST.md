# BC Data Loader - Deployment Checklist

## Pre-Deployment Checklist

### ✅ 1. Logo/Icon Setup

- [ ] **Replace BCDataLoaderItem_Icon.png with AGIC logo**
  - Location: `Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png`
  - Current status: ⚠️ Placeholder icon installed (needs replacement)
  - Format: PNG, 128x128 pixels recommended
  - Instructions: See [LOGO_SETUP_INSTRUCTIONS.md](./LOGO_SETUP_INSTRUCTIONS.md)

- [ ] **Optional: Replace Workload_Icon.png** (overall workload branding)
  - Location: `Workload\Manifest\assets\images\Workload_Icon.png`

### ✅ 2. Environment Configuration

- [ ] **Copy and configure .env file**
  ```powershell
  cd Workload
  cp .env.template .env
  ```

- [ ] **Edit .env with your values:**
  - `WORKLOAD_BE_URL` - Your backend URL
  - `WORKLOAD_PUBLISHER_TENANT_ID` - Your Azure AD tenant
  - `WORKLOAD_APPLICATION_ID` - Your app registration ID
  - `ITEM_NAMES` - Should include `HelloWorld,BCDataLoader`
  - `DEV_MODE` - Set to `true` for development

### ✅ 3. Azure Resources Preparation

- [ ] **Key Vault Setup**
  - Create Azure Key Vault if not exists
  - Store BC API client secret in Key Vault
  - Note the secret URL (format: `https://{vault}.vault.azure.net/secrets/{name}`)
  - Grant Fabric Managed Identity access to Key Vault

- [ ] **App Registration for BC API**
  - Create Azure AD App Registration
  - Grant API permissions: `https://api.businesscentral.dynamics.com/.default`
  - Create client secret and store in Key Vault
  - Note the Application (Client) ID

- [ ] **Workspace Preparation**
  - Identify target Fabric workspace ID
  - Ensure you have admin/contributor access
  - Workspace will auto-create lakehouse "bc2fabric_internal"

### ✅ 4. Business Central Configuration

- [ ] **BC Environment Details**
  - Environment name (e.g., "Production", "Sandbox")
  - Company names to sync (at least one)
  - Test OData endpoint access

- [ ] **Entity Selection Planning**
  - Decide which entities to sync (or select during installation)
  - Common entities:
    - customers
    - vendors
    - items
    - salesOrders
    - purchaseOrders
    - generalLedgerEntries

## Build & Deploy Steps

### Step 1: Build Manifest

```powershell
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads"
.\scripts\Build\BuildManifest.ps1
```

**Expected output:**
```
✓ Manifest built successfully
✓ Assets copied
✓ Items registered
```

**Troubleshooting:**
- If icon error: Verify `BCDataLoaderItem_Icon.png` exists in assets/images
- If item not found: Check `Product.json` includes "BCDataLoader" in recommendedItemTypes

### Step 2: Build Frontend (if code changed)

```powershell
.\scripts\Build\BuildFrontend.ps1
```

**Expected output:**
```
✓ npm install completed
✓ TypeScript compilation successful
✓ Build artifacts generated
```

**Troubleshooting:**
- If TypeScript errors: Run `npm run type-check` to see details
- If dependency errors: Delete `node_modules` and `package-lock.json`, then retry

### Step 3: Deploy to Fabric

```powershell
.\scripts\Deploy\DeployWorkload.ps1
```

**Expected output:**
```
✓ Workload registered with Fabric
✓ Backend deployed
✓ Frontend deployed
✓ Items registered: HelloWorld, BCDataLoader
```

**Troubleshooting:**
- If auth error: Verify `.env` has correct tenant ID and application ID
- If deployment fails: Check Azure Portal for app registration permissions
- If item not visible: Clear browser cache and refresh Fabric

## Post-Deployment Verification

### ✅ 5. Fabric UI Verification

- [ ] **Navigate to Fabric workspace**
  - URL: https://app.fabric.microsoft.com/

- [ ] **Verify BC Data Loader appears in Create dialog**
  - Click "+ New Item"
  - Should see "BC Data Loader" with AGIC logo
  - Description: "Load data from Business Central OData APIs into Fabric Lakehouse Delta Tables"

- [ ] **Create test BC Data Loader item**
  - Name it "BC Sync Test"
  - Should open installation wizard

### ✅ 6. Installation Wizard Testing

- [ ] **Step 1: Configuration**
  - Enter App Registration ID
  - Enter Key Vault URL (from preparation step)
  - Enter BC Environment name
  - Enter at least one company name
  - Click "Next: Select Entities"

- [ ] **Step 2: Entity Discovery**
  - System should connect to BC via Key Vault
  - Should display list of available OData entities
  - Verify common entities appear: customers, vendors, items
  - Select desired entities (checkbox UI)
  - Click "Install"

- [ ] **Step 3: Installation Progress**
  - Watch 5-step progress:
    1. Creating folder structure
    2. Creating database mirror
    3. Creating lakehouse "bc2fabric_internal"
    4. Saving configuration
    5. Validating setup
  - All steps should show ✓ status
  - Should see "Installation Complete!" message

### ✅ 7. Sync Testing

- [ ] **Navigate to Default View**
  - After installation completes, should show main sync interface
  - Left panel: Configuration summary
  - Center panel: Sync button + history table

- [ ] **Test Sync Operation**
  - Click "Sync Now" button
  - Progress bar should appear
  - Monitor console for sync messages
  - Wait for completion (depends on data volume)

- [ ] **Verify Lakehouse Data**
  - Navigate to workspace
  - Open "bc2fabric_internal" lakehouse
  - Check "Tables" folder contains:
    - `{CompanyName}_{EntityName}` folders (e.g., `MyCompany_customers`)
    - JSONL data files inside each folder

- [ ] **Check Sync History**
  - Sync history table should show completed sync
  - Verify: timestamp, status (success), company, entity, records processed
  - If errors: Check error message column

## Troubleshooting Guide

### Icon Not Appearing

**Symptom:** BC Data Loader shows default icon instead of AGIC logo

**Solution:**
1. Verify file exists: `Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png`
2. Rebuild manifest: `.\scripts\Build\BuildManifest.ps1`
3. Redeploy: `.\scripts\Deploy\DeployWorkload.ps1`
4. Clear browser cache (Ctrl+Shift+Delete in browser)
5. Hard refresh Fabric page (Ctrl+F5)

### Key Vault Access Denied

**Symptom:** Error during entity discovery: "Key Vault access failed"

**Solution:**
1. Verify Key Vault URL format: `https://{vault-name}.vault.azure.net/secrets/{secret-name}`
2. Check Fabric workload managed identity has "Get" permission on Key Vault
3. In Azure Portal → Key Vault → Access Policies → Add Access Policy
4. Grant "Get" secret permission to Fabric managed identity

### BC Authentication Failed

**Symptom:** Error: "BC Authentication failed" or "OAuth token request failed"

**Solution:**
1. Verify App Registration has correct API permissions
2. Required permission: `https://api.businesscentral.dynamics.com/.default`
3. Check client secret in Key Vault is correct and not expired
4. Verify BC environment name matches exactly (case-sensitive)
5. Test manually: Try BC OData URL in browser with token

### No Entities Found

**Symptom:** Entity discovery returns empty list

**Solution:**
1. Verify company name is correct (use exact name from BC)
2. Check BC user has permissions to read $metadata
3. Try different company if one fails
4. Test metadata URL manually:
   ```
   https://api.businesscentral.dynamics.com/v2.0/{tenant}/{env}/ODataV4/Company('{company}')/$metadata
   ```

### Lakehouse Not Created

**Symptom:** Installation fails at "Creating lakehouse" step

**Solution:**
1. Verify workspace ID is correct
2. Check you have Contributor/Admin role in workspace
3. Verify workspace has capacity allocated
4. Try creating lakehouse manually first to test permissions

### Sync Fails with "No records to sync"

**Symptom:** Sync completes but shows 0 records processed

**Solution:**
1. Verify entity name is correct (check $metadata for exact name)
2. Check company has data for selected entity
3. Try simpler entity first (e.g., customers)
4. Review filter expressions - may be too restrictive
5. Use "Preview Data" feature to test entity access

### Data Not Appearing in Lakehouse

**Symptom:** Sync says success but no data in lakehouse

**Solution:**
1. Check lakehouse "Tables" folder (not "Files")
2. Look for folder pattern: `{Company}_{Entity}`
3. Verify JSONL files exist inside folders
4. Check file size - should not be 0 bytes
5. Review sync history for actual records written count

## Performance Tuning

### Large Data Volumes

If syncing large datasets (>10,000 records):

- [ ] **Enable incremental sync** (in future releases)
- [ ] **Sync during off-peak hours**
- [ ] **Use field selection** to reduce payload size
- [ ] **Sync entities in batches** (select subset of entities per sync)

### Multi-Company Sync

For multiple companies:

- [ ] **Test with 1 company first**
- [ ] **Add companies incrementally**
- [ ] **Monitor sync duration** per company
- [ ] **Consider separate BC Data Loader items** for different company groups

## Next Steps

After successful deployment and testing:

1. **Schedule Regular Syncs**
   - Manual sync via UI "Sync Now" button
   - Future: Automated scheduling (planned feature)

2. **Monitor Sync History**
   - Check for failed syncs
   - Review error messages
   - Adjust entity selection if needed

3. **Query Delta Tables**
   - Use Fabric notebooks to query synced data
   - Create Power BI reports on lakehouse data
   - Build data pipelines using synced data

4. **Production Rollout**
   - Test thoroughly in dev/test workspace first
   - Document your specific entity selections
   - Create runbook for support team
   - Train end users on sync operations

## Support Resources

- **Project Documentation:**
  - [BC_MULTI_ENTITY_SYNC.md](./BC_MULTI_ENTITY_SYNC.md) - Feature documentation
  - [LOGO_SETUP_INSTRUCTIONS.md](./LOGO_SETUP_INSTRUCTIONS.md) - Logo customization
  - [README.md](./README.md) - Main project README

- **Microsoft Fabric Docs:**
  - https://learn.microsoft.com/fabric/
  - Workload development guide
  - OneLake storage documentation

- **Business Central API:**
  - https://learn.microsoft.com/dynamics365/business-central/dev-itpro/api-reference/v2.0/
  - OData V4 specification
  - Entity reference

## Deployment Sign-Off

| Step | Status | Date | Notes |
|------|--------|------|-------|
| Logo replaced with AGIC logo | ⚠️ Pending | | See LOGO_SETUP_INSTRUCTIONS.md |
| Environment configured (.env) | ⬜ | | |
| Azure resources prepared | ⬜ | | |
| Manifest built | ⬜ | | |
| Frontend built | ⬜ | | |
| Deployed to Fabric | ⬜ | | |
| UI verification passed | ⬜ | | |
| Installation wizard tested | ⬜ | | |
| Sync operation tested | ⬜ | | |
| Data verified in lakehouse | ⬜ | | |
| Production approved | ⬜ | | |

---

**Deployment completed by:** _______________
**Date:** _______________
**Workspace ID:** _______________
**Environment:** ☐ Dev ☐ Test ☐ Production
