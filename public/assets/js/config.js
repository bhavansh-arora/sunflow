/* SunFlow site settings.
   formEndpoint: where quote requests are POSTed as JSON. Point it at a Make /
   Zapier webhook (which can create the item on SunFlow's monday.com board and
   email the right person), Formspree, or any endpoint that accepts JSON.
   Leave it empty to run the form in demo mode (nothing is sent; the lead is
   kept in this browser only so the flow can be reviewed end to end). */
window.SUNFLOW = {
  formEndpoint: "",
  phone: "647-706-9908",
  phoneHref: "tel:+16477069908",
  email: "info@sunflow.ca",

  // Who each kind of request goes to. Edit names/emails to match the team.
  routing: {
    "commercial-solar": { desk: "Commercial Solar", owner: "Mike McCann", email: "mike@sunflow.ca" },
    "residential-solar": { desk: "Residential Solar", owner: "Colleen Keough", email: "colleen@sunflow.ca" },
    "roofing": { desk: "Roofing", owner: "Colleen Keough", email: "colleen@sunflow.ca" },
    "luxury": { desk: "Luxury Exteriors", owner: "Mike McCann", email: "mike@sunflow.ca" },
    "insulation": { desk: "Insulation", owner: "Colleen Keough", email: "colleen@sunflow.ca" },
    "unsure": { desk: "General enquiries", owner: "Colleen Keough", email: "colleen@sunflow.ca" }
  }
};
