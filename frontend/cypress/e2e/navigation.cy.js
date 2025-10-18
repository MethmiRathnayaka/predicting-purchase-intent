describe("Sidebar Navigation", () => {
  it("navigates to Upload Dataset page", () => {
    cy.visit("http://localhost:3000");
    cy.contains("Upload Dataset").click();
    cy.url().should("include", "/upload-dataset");
  });

  it("navigates to Visualizations page", () => {
    cy.visit("http://localhost:3000");
    cy.contains("Visualizations").click();
    cy.url().should("include", "/visualizations");
  });

  it("navigates to Insights & Suggestions page", () => {
    cy.visit("http://localhost:3000");
    cy.contains("Insights & Suggestions").click();
    cy.url().should("include", "/insights-suggestions");
  });
});
