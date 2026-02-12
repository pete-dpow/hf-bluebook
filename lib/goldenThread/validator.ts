/**
 * Golden Thread Validator — BSA Section 88/91 compliance checks.
 * Validates that a compiled GT package has the required data for compliant handover.
 */

import type { GoldenThreadData } from "./compiler";

export interface ValidationResult {
  section_88_compliant: boolean;
  section_91_compliant: boolean;
  audit_trail_complete: boolean;
  warnings: ValidationWarning[];
  score: number; // 0-100
}

export interface ValidationWarning {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  section: "s88" | "s91" | "general";
}

/**
 * Validate a compiled Golden Thread package against BSA 2022 requirements.
 *
 * Section 88: Requires structured records of fire safety design and installation
 *  - Product specifications for all fire safety products
 *  - Installation records with dates and personnel
 *  - Product references linked to regulations
 *
 * Section 91: Requires complete digital audit trail
 *  - Structured digital format (JSON/PDF/CSV)
 *  - Traceability from design through installation to certification
 *  - Change history
 */
export function validateGoldenThread(data: GoldenThreadData): ValidationResult {
  const warnings: ValidationWarning[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // === Section 88 checks: Design & installation records ===

  // Check 1: Has at least one quote (design/scope)
  totalChecks++;
  if (data.quotes.length === 0) {
    warnings.push({
      severity: "error",
      code: "S88_NO_QUOTES",
      message: "No quotations found for this project. Section 88 requires design/scope records.",
      section: "s88",
    });
  } else {
    passedChecks++;
  }

  // Check 2: Has products with specifications
  totalChecks++;
  if (data.products.length === 0) {
    warnings.push({
      severity: "error",
      code: "S88_NO_PRODUCTS",
      message: "No fire safety products found. Section 88 requires product specifications.",
      section: "s88",
    });
  } else {
    passedChecks++;

    // Check 2b: Products have specifications
    totalChecks++;
    const productsWithSpecs = data.products.filter(
      (p) => p.specifications && Object.keys(p.specifications).length > 0
    );
    if (productsWithSpecs.length < data.products.length) {
      const missing = data.products.length - productsWithSpecs.length;
      warnings.push({
        severity: "warning",
        code: "S88_MISSING_SPECS",
        message: `${missing} product(s) have no specifications. Complete specifications improve Section 88 compliance.`,
        section: "s88",
      });
    } else {
      passedChecks++;
    }
  }

  // Check 3: Products linked to regulations
  totalChecks++;
  const productsWithRegs = data.products.filter((p) => p.regulations.length > 0);
  if (productsWithRegs.length === 0 && data.products.length > 0) {
    warnings.push({
      severity: "error",
      code: "S88_NO_REGULATION_LINKS",
      message: "No products are linked to regulations. Section 88 requires regulatory compliance records.",
      section: "s88",
    });
  } else if (productsWithRegs.length < data.products.length) {
    const missing = data.products.length - productsWithRegs.length;
    warnings.push({
      severity: "warning",
      code: "S88_PARTIAL_REGULATION_LINKS",
      message: `${missing} product(s) have no linked regulations. Link all products to relevant standards.`,
      section: "s88",
    });
    passedChecks++;
  } else {
    passedChecks++;
  }

  // Check 4: Has certifications or test evidence
  totalChecks++;
  const productsWithCerts = data.products.filter(
    (p) => (p.certifications && p.certifications.length > 0) || p.files.some((f) => f.file_type === "certificate")
  );
  if (productsWithCerts.length === 0 && data.products.length > 0) {
    warnings.push({
      severity: "warning",
      code: "S88_NO_CERTIFICATES",
      message: "No product certifications or test evidence found. Upload certificates for full compliance.",
      section: "s88",
    });
  } else {
    passedChecks++;
  }

  // Check 5: Has product files (datasheets, installation guides)
  totalChecks++;
  if (data.metadata.total_files === 0 && data.products.length > 0) {
    warnings.push({
      severity: "warning",
      code: "S88_NO_FILES",
      message: "No product files uploaded. Include datasheets and installation guides for Section 88.",
      section: "s88",
    });
  } else {
    passedChecks++;
  }

  const section88Passed = !warnings.some((w) => w.section === "s88" && w.severity === "error");

  // === Section 91 checks: Digital audit trail ===

  // Check 6: Has structured data (always true if we got this far)
  totalChecks++;
  passedChecks++;

  // Check 7: Has traceability (quotes → products → regulations chain)
  totalChecks++;
  const hasTraceability = data.quotes.length > 0 && data.products.length > 0 && data.regulations_summary.length > 0;
  if (!hasTraceability) {
    warnings.push({
      severity: "warning",
      code: "S91_INCOMPLETE_CHAIN",
      message: "Incomplete traceability chain. Full compliance requires quotes → products → regulations linkage.",
      section: "s91",
    });
  } else {
    passedChecks++;
  }

  // Check 8: Has building reference
  totalChecks++;
  if (!data.project.building_reference) {
    warnings.push({
      severity: "info",
      code: "S91_NO_BUILDING_REF",
      message: "No building reference set. Add a building reference for higher-risk building identification.",
      section: "s91",
    });
  } else {
    passedChecks++;
  }

  // Check 9: Has audit trail entries
  totalChecks++;
  if (data.audit_trail.length === 0) {
    warnings.push({
      severity: "info",
      code: "S91_NO_AUDIT_HISTORY",
      message: "No prior audit trail entries. This is normal for the first package generation.",
      section: "s91",
    });
    passedChecks++; // First generation is fine
  } else {
    passedChecks++;
  }

  const section91Passed = !warnings.some((w) => w.section === "s91" && w.severity === "error");
  const auditTrailComplete = section91Passed && hasTraceability;

  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  return {
    section_88_compliant: section88Passed,
    section_91_compliant: section91Passed,
    audit_trail_complete: auditTrailComplete,
    warnings,
    score,
  };
}
