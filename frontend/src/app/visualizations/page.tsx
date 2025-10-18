export default function Visualizations() {
  // 🧩 Define variables BEFORE return
  const dataset_id_value = 1; // Value for the Looker Studio Parameter
  const parameterId = 'dataset_id'; // ⬅️ THIS MUST MATCH YOUR LOOKER STUDIO PARAMETER ID
  
  const reportId = "5841b56f-c70e-4aba-8bbb-49c8bcd2457f";
  const pageId = "GAcaF";

  // 1. Create the JSON object mapping the Parameter ID to its value
  const paramsObject = {};
  paramsObject[parameterId] = dataset_id_value.toString(); // Ensure value is a string if necessary

  // 2. Stringify and URL-encode the JSON object for the 'params' URL argument
  const encodedParams = encodeURIComponent(JSON.stringify(paramsObject));
  
  // 3. Construct the final URL using 'params'
  const lookerStudioSrc = 
    `https://lookerstudio.google.com/embed/reporting/${reportId}/page/${pageId}?params=${encodedParams}`;


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c]">
      <h2 className="text-3xl font-bold mb-8 text-[#a259e6]">Visualizations</h2>
      <div
        className="rounded-2xl shadow-lg border-4 border-[#a259e6] bg-[#23283a]/80 p-6"
        style={{ boxShadow: "0 8px 32px 0 rgba(162, 89, 230, 0.25)" }}
      >
        {/* <iframe
          width="900"
          height="600"
          src="https://lookerstudio.google.com/embed/reporting/94a32404-94cf-4ad7-9323-60baa3e9b8e7/page/GAcaF"
          frameBorder="0"
          style={{ border: 0, borderRadius: "1rem", background: "#23283a" }}
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        ></iframe> */}
        <iframe
          width="900"
          height="550"
          src="https://lookerstudio.google.com/embed/reporting/5841b56f-c70e-4aba-8bbb-49c8bcd2457f/page/GPoaF"
          frameBorder="0"
          style={{ border: 0 }}
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        ></iframe>
        <div className="mt-4 text-center text-[#b0b3b8] text-sm">
          <span>
            <b>Tip:</b> To open Looker Studio and draw your own charts, click
            the <b>Looker Studio</b> text at the bottom right of the 
            report.
          </span>
        </div>
      </div>
    </div>
  );
}
