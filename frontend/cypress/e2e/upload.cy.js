describe("CSV Upload", () => {
  it("shows success message after upload", () => {
    cy.visit("http://localhost:3000/upload-dataset");
    cy.get('input[type="file"]').selectFile("cypress/fixtures/test.csv", {
      force: true,
    });
    cy.contains("Upload complete").should("be.visible");
  });
});
