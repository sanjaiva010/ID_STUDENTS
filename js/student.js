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

    // Initialize EmailJS
    emailjs.init("YOUR_EMAILJS_PUBLIC_KEY");

    // Update courses when college changes (show UG courses first, then B.Tech)
    collegeSelect.addEventListener('change', function() {
        const selectedCollege = this.value;
        courseSelect.innerHTML = '<option value="">Loading courses...</option>';
        courseSelect.disabled = true;

        if (selectedCollege && collegesData[selectedCollege]) {
            const college = collegesData[selectedCollege];
            
            // Show UG courses first, then B.Tech
            let allCourses = [];
            
            // Add UG courses
            if (college.courses) {
                college.courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.code;
                    option.textContent = `${course.code} - ${course.name}`;
                    courseSelect.appendChild(option);
                    allCourses.push(course.code);
                });
            }
            
            // Add B.Tech courses
            if (college.bTech) {
                college.bTech.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.code;
                    option.textContent = `${course.code} - ${course.name}`;
                    courseSelect.appendChild(option);
                    allCourses.push(course.code);
                });
            }
            
            courseSelect.disabled = false;
            
            // Add "Select B.Tech Course" option after UG courses
            const bTechOption = document.createElement('option');
            bTechOption.value = "btech";
            bTechOption.textContent = "B.Tech Courses";
            bDogOption.disabled = true;
            courseSelect.appendChild(bTechOption);
        } else {
            courseSelect.innerHTML = '<option value="">Select college first</option>';
        }
    });

    // Handle course type change (UG vs B.Tech)
    courseSelect.addEventListener('change', function() {
        if (this.value === "btech") {
            // Show B.Tech courses only
            courseSelect.innerHTML = '<option value="">Select B.Tech Course</option>';
            const selectedCollege = document.getElementById('college').value;
            if (selectedCollege && collegesData[selectedCollege] && collegesData[selectedCollege].bTech) {
                collegesData[selectedCollege].bTech.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.code;
                    option.textContent = `${course.code} - ${course.name}`;
                    courseSelect.appendChild(option);
                });
            }
        } else {
            // UG course selected - keep as is
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
        const selectedCollege = collegeSelect.value;
        const selectedCourse = courseSelect.value;
        const collegeInfo = collegesData[selectedCollege];
        
        // Determine course name based on selection
        let courseName;
        if (selectedCourse === "btech" && collegeInfo.bTech) {
            // Show B.Tech courses list in the name
            const bTechCourses = collegeInfo.bTech.map(c => `${c.code} - ${c.name}`);
            courseName = `B.Tech: ${bTechCourses.join(', ')}`;
        } else if (collegeInfo.courses) {
            const courseObj = collegeInfo.courses.find(c => c.code === selectedCourse);
            courseName = courseObj ? `${selectedCourse} - ${courseObj.name}` : selectedCourse;
        } else {
            courseName = selectedCourse;
        }

        const studentData = {
            name: name,
            regNo: document.getElementById('regNo').value.trim(),
            studentType: document.getElementById('studentType').value,
            bloodGroup: bloodGroupSelect.value === 'other' ? otherBloodInput.value.trim().toUpperCase() : bloodGroupSelect.value,
            college: selectedCollege,
            course: selectedCourse,
            courseName: courseName,
            address: document.getElementById('address').value.trim(),
            dadPhone: document.getElementById('dadPhone').value.trim(),
            studentPhone: document.getElementById('studentPhone').value.trim(),
            email: document.getElementById('email').value.trim(),
            timestamp: new Date().toISOString(),
            id: generateStudentId()
        };

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
            await sendEmail(studentData, qrDataUrl, collegeInfo.fullName, courseName);

            // Show success modal
            sentEmailEl.textContent = studentData.email;
            successModal.style.display = 'block';

            // Reset form
            form.reset();
            otherBloodContainer.style.display = 'none';
            courseSelect.innerHTML = '<option value="">Select college first</option>';
            courseSelect.disabled = true;
            document.getElementById('course').disabled = true;

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to send email. Please check your EmailJS configuration.\n\nError: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register & Send QR to Email';
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
            course: courseName,
            student_type: studentData.studentType === 'hosteller' ? 'Hosteller' : 'Day Scholar',
            blood_group: studentData.bloodGroup,
            address: studentData.address,
            dad_phone: studentData.dadPhone,
            student_phone: studentData.studentPhone || 'Not provided',
            qr_code_image: qrDataUrl,
            student_id: studentData.id,
            date: new Date().toLocaleDateString()
        };

        // Send via EmailJS - you need to configure your service/template
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