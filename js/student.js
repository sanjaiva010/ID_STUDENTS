document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const collegeSelect = document.getElementById('college');
    const courseSelect = document.getElementById('course');
    const modal = document.getElementById('idCardModal');
    const closeModal = document.querySelector('.close-modal');
    const downloadBtn = document.getElementById('downloadCard');
    const sendEmailBtn = document.getElementById('sendEmail');

    let currentQRCode = null;
    let studentData = null;

    // Update courses when college changes
    collegeSelect.addEventListener('change', function() {
        const selectedCollege = this.value;
        courseSelect.innerHTML = '<option value="">Loading courses...</option>';
        courseSelect.disabled = true;

        if (selectedCollege && collegesData[selectedCollege]) {
            const courses = collegesData[selectedCollege].courses;
            courseSelect.innerHTML = '<option value="">Select Course</option>';
            
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.code;
                option.textContent = `${course.code} - ${course.name}`;
                courseSelect.appendChild(option);
            });
            
            courseSelect.disabled = false;
        } else {
            courseSelect.innerHTML = '<option value="">Select college first</option>';
        }
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Collect form data
        studentData = {
            name: document.getElementById('studentName').value.trim(),
            regNo: document.getElementById('regNo').value.trim(),
            studentType: document.getElementById('studentType').value,
            bloodGroup: document.getElementById('bloodGroup').value,
            college: collegeSelect.value,
            course: courseSelect.value,
            address: document.getElementById('address').value.trim(),
            dadPhone: document.getElementById('dadPhone').value.trim(),
            studentPhone: document.getElementById('studentPhone').value.trim(),
            email: document.getElementById('email').value.trim(),
            timestamp: new Date().toISOString(),
            id: generateStudentId()
        };

        // Get college and course names
        const collegeName = collegesData[studentData.college].name;
        const courseObj = collegesData[studentData.college].courses.find(c => c.code === studentData.course);
        const courseName = courseObj ? courseObj.name : studentData.course;

        // Update ID card
        document.getElementById('cardCollege').textContent = collegeName;
        document.getElementById('cardName').textContent = studentData.name;
        document.getElementById('cardRegNo').textContent = studentData.regNo;
        document.getElementById('cardCourse').textContent = `${studentData.course} - ${courseName}`;
        document.getElementById('cardType').textContent = studentData.studentType === 'hosteller' ? 'Hosteller' : 'Day Scholar';
        document.getElementById('cardBlood').textContent = studentData.bloodGroup;

        // Generate QR Code
        generateQRCode(studentData);

        // Save to localStorage
        saveStudentData(studentData);

        // Show modal
        modal.style.display = 'block';
    });

    // Generate unique student ID
    function generateStudentId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `STU-${timestamp}-${randomStr}`.toUpperCase();
    }

    // Generate QR Code
    function generateQRCode(data) {
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';

        const qrData = JSON.stringify({
            id: data.id,
            name: data.name,
            regNo: data.regNo,
            college: collegesData[data.college].shortName,
            course: data.course,
            type: data.studentType,
            blood: data.bloodGroup
        });

        currentQRCode = new QRCode(qrContainer, {
            text: qrData,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Save student data to localStorage
    function saveStudentData(data) {
        let students = JSON.parse(localStorage.getItem('students')) || [];
        students.push(data);
        localStorage.setItem('students', JSON.stringify(students));
    }

    // Close modal
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    // Close modal on outside click
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Download ID Card
    downloadBtn.addEventListener('click', function() {
        const idCard = document.getElementById('idCard');
        
        // Use html2canvas if available, otherwise show alert
        if (typeof html2canvas !== 'undefined') {
            html2canvas(idCard).then(canvas => {
                const link = document.createElement('a');
                link.download = `ID_Card_${studentData.regNo}.png`;
                link.href = canvas.toDataURL();
                link.click();
            });
        } else {
            alert('Download feature requires html2canvas library. For now, you can take a screenshot of the ID card.');
        }
    });

    // Send to Email (simulated)
    sendEmailBtn.addEventListener('click', function() {
        const email = document.getElementById('email').value;
        alert(`ID Card would be sent to: ${email}\n\nNote: This is a demo. In production, this would send an actual email with the QR code.`);
    });

    // Phone number validation - only allow numbers
    document.getElementById('dadPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
    });

    document.getElementById('studentPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
    });
});
