const axios = require('axios');

async function run() {
  try {
    // 1. Get publications
    const pubs = await axios.get('http://localhost:3000/api/publications');
    const pub = pubs.data[0];
    if (!pub) {
      console.log("No pub found");
      return;
    }
    console.log("Found pub:", pub.id, pub.title);

    // 2. Get employees
    const emps = await axios.get('http://localhost:3000/api/employees');
    const emp = emps.data[0];
    if (!emp) {
      console.log("No emp found");
      return;
    }
    console.log("Found emp:", emp.id, emp.name);

    // 3. Assign
    console.log("Assigning...");
    const res = await axios.put(`http://localhost:3000/api/publications/${pub.id}`, {
      assigned_to: emp.id
    });
    console.log("Assigned:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
run();
