document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const collegeSelect = document.getElementById('college');
    const courseSelect = document.getElementById('course');
    const bloodGroupSelect = document.getElementById('bloodGroup');
    const otherBloodContainer = document.getElementById('otherBloodGroupContainer');
    const otherBloodInput = document.getElementById('otherBloodGroup');
    const successModal = document.getElementById('successModal');
    const closeSuccess = document.getElementById('closeSuccess');
    const submitBtn = document.getElementById('submitBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadMsg = document.getElementById('downloadMsg');
    const qrIdEl = document.getElementById('qrId');
    const qrNameEl = document.getElementById('qrName');
    const qrCodeDisplay = document.getElementById('qrCodeDisplay');

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
        submitBtn.textContent = 'Generating QR...';

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

            // Display QR code in success modal
            displayQRInModal(qrDataUrl, studentData);

            // Show success modal
            successModal.style.display = 'block';

            // Reset form
            form.reset();
            otherBloodContainer.style.display = 'none';
            courseSelect.innerHTML = '<option value="">Select college first</option>';
            courseSelect.disabled = true;
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate QR code. Please try again.\n\nError: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register & Generate QR';
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

    // Display QR code in success modal
    function displayQRInModal(qrDataUrl, studentData) {
        // Show the already-generated QR code image directly (do NOT re-encode
        // the image data URL into another QR code - it's far too long to fit)
        qrCodeDisplay.innerHTML = '';
        const qrImg = document.createElement('img');
        qrImg.src = qrDataUrl;
        qrImg.alt = 'Student QR Code';
        qrImg.width = 150;
        qrImg.height = 150;
        qrCodeDisplay.appendChild(qrImg);

        // Show QR data
        qrIdEl.textContent = studentData.id;
        qrNameEl.textContent = studentData.name;

        // Reset download/close state for this new registration
        downloadBtn.style.display = 'inline-block';
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('downloaded');
        downloadBtn.textContent = '📥 DOWNLOAD QR CODE';
        downloadMsg.style.display = 'block';
        downloadMsg.textContent = 'Tap the button above to save the QR image to your device';
        closeSuccess.disabled = true;
        closeSuccess.textContent = 'Download QR Code First';

        // Handle download
        downloadBtn.onclick = function() {
            downloadQRCode(qrDataUrl);
        };
    }

    // Helper: convert a base64 data URL into a real Blob. Blob-based
    // downloads work far more reliably across browsers than data URLs do.
    function dataUrlToBlob(dataUrl) {
        const [header, base64] = dataUrl.split(',');
        const mimeMatch = header.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
    }

    // Mark the QR as downloaded/saved and unlock the Close button
    function markQRSaved(message) {
        downloadBtn.textContent = '✓ DOWNLOADED';
        downloadBtn.classList.add('downloaded');
        downloadMsg.textContent = message;
        closeSuccess.disabled = false;
        closeSuccess.textContent = "I've Downloaded It — Close";
    }

    // Only iOS actually needs the Share Sheet - it's the sole platform that
    // blocks silent/direct downloads. Everywhere else, a real download works.
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS 13+
    }

    // Download QR code
    async function downloadQRCode(qrDataUrl) {
        const filename = `QR_Code_${qrIdEl.textContent}.png`;
        const blob = dataUrlToBlob(qrDataUrl);

        if (isIOS()) {
            // iOS Safari blocks any silent/direct download - the Share Sheet's
            // one-tap "Save Image" is the most direct option Apple allows.
            try {
                const file = new File([blob], filename, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Student QR Code' });
                    markQRSaved('✅ Saved via the share menu. You can download it again anytime.');
                    return;
                }
            } catch (err) {
                if (err && err.name === 'AbortError') {
                    downloadMsg.textContent = 'Cancelled — tap Download again to save your QR code.';
                    return;
                }
                console.warn('Share failed on iOS, falling back:', err);
            }
            // No Share API available - last resort: full-screen long-press
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(
                    '<html><head><title>' + filename + '</title></head>' +
                    '<body style="margin:0;display:flex;align-items:center;justify-content:center;' +
                    'min-height:100vh;background:#111;">' +
                    '<img src="' + qrDataUrl + '" style="max-width:90%;height:auto;">' +
                    '</body></html>'
                );
                win.document.close();
            }
            markQRSaved('📱 In the new tab, press and hold the QR code, then tap "Save Image" or "Add to Photos".');
            return;
        }

        // Android, Windows, Mac (Chrome/Firefox/Edge/Samsung Internet): a real
        // direct download straight to the Downloads folder, no extra dialog.
        try {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            markQRSaved('✅ QR code downloaded to your device. You can download it again anytime.');
            return;
        } catch (err) {
            console.error('Direct download failed, opening image instead:', err);
        }

        // 3) Last resort: open the QR full-screen so the student can save it manually
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(
                '<html><head><title>' + filename + '</title></head>' +
                '<body style="margin:0;display:flex;align-items:center;justify-content:center;' +
                'min-height:100vh;background:#111;">' +
                '<img src="' + qrDataUrl + '" style="max-width:90%;height:auto;">' +
                '</body></html>'
            );
            win.document.close();
        }
        markQRSaved('📱 In the new tab, press and hold the QR code, then tap "Save Image" or "Add to Photos".');
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

    // Close modal on outside click - but only if the QR has actually been downloaded
    window.addEventListener('click', function(e) {
        if (e.target === successModal && !closeSuccess.disabled) {
            successModal.style.display = 'none';
        }
    });
});
