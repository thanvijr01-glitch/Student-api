const http = require('http');
const fs = require('fs');

let students = [];
if (fs.existsSync('students.json')) {
  const data = fs.readFileSync('students.json');
  students = JSON.parse(data);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function validateStudent(student) {
  if (!student.name || !student.email || !student.course || !student.year) {
    return "All fields are required";
  }
  if (!/^\S+@\S+\.\S+$/.test(student.email)) {
    return "Invalid email format";
  }
  if (student.year < 1 || student.year > 4) {
    return "Year must be between 1 and 4";
  }
  return null;
}

function saveToFile() {
  fs.writeFileSync('students.json', JSON.stringify(students, null, 2));
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const urlParts = req.url.split('/');
  const queryString = req.url.split('?')[1];

  if (req.method === 'POST' && req.url === '/students') {
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', () => {
      const student = JSON.parse(body);
      const error = validateStudent(student);
      if (error) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ success: false, message: error }));
      }
      student.id = generateId();
      student.createdAt = new Date();
      student.updatedAt = new Date();
      students.push(student);
      saveToFile();
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, data: student }));
    });
  }

  else if (req.method === 'GET' && req.url.startsWith('/students')) {
    let result = students;

    if (queryString) {
      const params = new URLSearchParams(queryString);
      if (params.has('year')) {
        result = result.filter(s => s.year == params.get('year'));
      }
      if (params.has('page') && params.has('limit')) {
        const page = parseInt(params.get('page'));
        const limit = parseInt(params.get('limit'));
        const start = (page - 1) * limit;
        result = result.slice(start, start + limit);
      }
    }

    if (urlParts.length === 3 && urlParts[2]) {
      const student = students.find(s => s.id === urlParts[2]);
      if (!student) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ success: false, message: "Student not found" }));
      }
      return res.end(JSON.stringify({ success: true, data: student }));
    }

    res.end(JSON.stringify({ success: true, data: result }));
  }

  else if (req.method === 'PUT' && urlParts[1] === 'students' && urlParts[2]) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const student = students.find(s => s.id === urlParts[2]);
      if (!student) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ success: false, message: "Student not found" }));
      }
      const updatedData = JSON.parse(body);
      const error = validateStudent(updatedData);
      if (error) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ success: false, message: error }));
      }
      student.name = updatedData.name;
      student.email = updatedData.email;
      student.course = updatedData.course;
      student.year = updatedData.year;
      student.updatedAt = new Date();
      saveToFile();
      res.end(JSON.stringify({ success: true, data: student }));
    });
  }

  else if (req.method === 'DELETE' && urlParts[1] === 'students' && urlParts[2]) {
    const index = students.findIndex(s => s.id === urlParts[2]);
    if (index === -1) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ success: false, message: "Student not found" }));
    }
    students.splice(index, 1);
    saveToFile();
    res.end(JSON.stringify({ success: true, message: "Student deleted" }));
  }

  else {
    res.statusCode = 404;
    res.end(JSON.stringify({ success: false, message: "Route not found" }));
  }
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});