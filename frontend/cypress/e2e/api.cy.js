describe("Backend API", () => {
  it("shows backend response after upload", () => {
    cy.visit("http://localhost:3000/upload-dataset");
    cy.get('input[type="file"]').selectFile("cypress/fixtures/test.csv", {
      force: true,
    });
    cy.contains("Backend: File received by backend.").should("be.visible");
  });
});
