document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const collegeSelect = document.getElementById('college');
    const courseSelect = document.getElementById('course');
    const bloodGroupSelect = document.getElementById('bloodGroup');
    const otherBloodContainer = document.getElementById('otherBloodGroupContainer');
    const otherBloodInput = document.getElementById('otherBloodGroup');
    const successModal = document.getElementById('successModal');
    const closeSuccess = document.getElementById('closeSuccess');
    const sentEmailEl = document.getElementById('sentEmail');
    const submitBtn = document.getElementById('submitBtn');

    let currentQRCode = null;

    // Initialize EmailJS (replace with your credentials)
    emailjs.init("YOUR_EMAILJS_PUBLIC_KEY");

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

    // Handle blood group "Others" option
    bloodGroupSelect.addEventListener('change', function() {
        if (this.value === 'other') {
            otherBloodContainer.style.display = 'block';
            otherBloodInput.required = true;
        } else {
            otherBloodContainer.style.display = 'none';
            otherBloodInput.required = false;
            otherBloodInput.value = '';
        }
    });

    // Name validation - only letters and spaces
    document.getElementById('studentName').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-z\s]/g, '');
    });

    // Phone validation - only numbers, max 10 digits
    document.getElementById('dadPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
    });

    document.getElementById('studentPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
    });

    // Other blood group validation
    otherBloodInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-z0-9+\-]/g, '').toUpperCase();
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate name
        const name = document.getElementById('studentName').value.trim();
        if (!/^[A-Za-z\s]+$/.test(name)) {
            showError('nameError', 'Only letters and spaces allowed');
            return;
        }
        hideError('nameError');

        // Validate other blood group if selected
        if (bloodGroupSelect.value === 'other') {
            const otherBlood = otherBloodInput.value.trim();
            if (!otherBlood) {
                showError('otherBloodError', 'Please specify blood group');
                return;
            }
            if (!/^[A-Za-z0-9+\-]+$/.test(otherBlood)) {
                showError('otherBloodError', 'Invalid blood group format');
                return;
            }
            hideError('otherBloodError');
        }

        // Collect form data
        const studentData = {
            name: name,
            regNo: document.getElementById('regNo').value.trim(),
            studentType: document.getElementById('studentType').value,
            bloodGroup: bloodGroupSelect.value === 'other' ? otherBloodInput.value.trim().toUpperCase() : bloodGroupSelect.value,
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
        const collegeInfo = collegesData[studentData.college];
        const collegeName = collegeInfo.name;
        const courseObj = collegeInfo.courses.find(c => c.code === studentData.course);
        const courseName = courseObj ? courseObj.name : studentData.course;

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            // Generate QR Code data
            const qrData = JSON.stringify({
                id: studentData.id,
                name: studentData.name,
                regNo: studentData.regNo,
                college: collegeInfo.shortName,
                course: studentData.course,
                type: studentData.studentType,
                blood: studentData.bloodGroup
            });

            // Generate QR code as data URL
            const qrDataUrl = await generateQRCodeDataUrl(qrData);

            // Save to localStorage
            saveStudentData(studentData);

            // Send email with QR code
            await sendEmail(studentData, qrDataUrl, collegeName, courseName);

            // Show success modal
            sentEmailEl.textContent = studentData.email;
            successModal.style.display = 'block';

            // Reset form
            form.reset();
            otherBloodContainer.style.display = 'none';
            courseSelect.innerHTML = '<option value="">Select college first</option>';
            courseSelect.disabled = true;

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to send email. Please check your EmailJS configuration.\n\nError: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register & Send to Email';
        }
    });

    // Generate unique student ID
    function generateStudentId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `STU-${timestamp}-${randomStr}`.toUpperCase();
    }

    // Generate QR code as data URL
    function generateQRCodeDataUrl(text) {
        return new Promise((resolve, reject) => {
            const tempDiv = document.createElement('div');
            new QRCode(tempDiv, {
                text: text,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Wait for QR code to render
            setTimeout(() => {
                const img = tempDiv.querySelector('img');
                if (img) {
                    resolve(img.src);
                } else {
                    reject(new Error('QR code generation failed'));
                }
            }, 100);
        });
    }

    // Send email using EmailJS
    async function sendEmail(studentData, qrDataUrl, collegeName, courseName) {
        const templateParams = {
            to_email: studentData.email,
            to_name: studentData.name,
            student_name: studentData.name,
            reg_no: studentData.regNo,
            college: collegeName,
            course: `${studentData.course} - ${courseName}`,
            student_type: studentData.studentType === 'hosteller' ? 'Hosteller' : 'Day Scholar',
            blood_group: studentData.bloodGroup,
            address: studentData.address,
            dad_phone: studentData.dadPhone,
            student_phone: studentData.studentPhone || 'Not provided',
            qr_code_image: qrDataUrl,
            student_id: studentData.id,
            date: new Date().toLocaleDateString()
        };

        // Using EmailJS service
        // You need to set up EmailJS account and create a template
        // Replace with your actual service ID and template ID
        const response = await emailjs.send(
            'YOUR_EMAILJS_SERVICE_ID',
            'YOUR_EMAILJS_TEMPLATE_ID',
            templateParams
        );

        if (response.status !== 200) {
            throw new Error('Email sending failed');
        }

        return response;
    }

    // Save student data to localStorage
    function saveStudentData(data) {
        let students = JSON.parse(localStorage.getItem('students')) || [];
        students.push(data);
        localStorage.setItem('students', JSON.stringify(students));
    }

    // Error handling
    function showError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    function hideError(elementId) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    // Close success modal
    closeSuccess.addEventListener('click', function() {
        successModal.style.display = 'none';
    });

    // Close modal on outside click
    window.addEventListener('click', function(e) {
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });
});