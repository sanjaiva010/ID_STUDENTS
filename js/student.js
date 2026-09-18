// ============================================================
// IMPORTANT: paste your deployed Google Apps Script Web App URL here
// (Deploy -> New deployment -> Web app -> copy the URL ending in /exec)
// ============================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyouUDjYsCSmGciLqISDgGtdFgt1Ubn91TkpaQ9phN-GGymrPeMvaIXmIFLBYvBWBSX/exec';

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
    const manualOpenLink = document.getElementById('manualOpenLink');
    const sentEmailEl = document.getElementById('sentEmail');
    const emailStatusEl = document.getElementById('emailStatus');

    // Populate courses when college changes (colleges-data.js: courses only, no bTech)
    collegeSelect.addEventListener('change', function() {
        const selectedCollege = this.value;
        courseSelect.innerHTML = '<option value="">Loading courses...</option>';
        courseSelect.disabled = true;

        if (selectedCollege && collegesData[selectedCollege]) {
            const college = collegesData[selectedCollege];
            courseSelect.innerHTML = '<option value="">Select Course</option>';

            college.courses.forEach(function(course) {
                const option = document.createElement('option');
                option.value = course.code;
                option.textContent = course.code + ' - ' + course.name;
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
    document.getElementById('studentName').addEventListener('input', function() {
        this.value = this.value.replace(/[^A-Za-z\s]/g, '');
    });

    // Phone validation - only numbers, max 10 digits
    document.getElementById('dadPhone').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
    });

    document.getElementById('studentPhone').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
    });

    // Other blood group validation
    otherBloodInput.addEventListener('input', function() {
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
        const courseObj = collegeInfo.courses.find(function(c) { return c.code === selectedCourse; });
        const courseName = courseObj ? (selectedCourse + ' - ' + courseObj.name) : selectedCourse;

        const studentData = {
            id: generateStudentId(),
            name: name,
            regNo: document.getElementById('regNo').value.trim(),
            studentType: document.getElementById('studentType').value,
            bloodGroup: bloodGroupSelect.value === 'other' ? otherBloodInput.value.trim().toUpperCase() : bloodGroupSelect.value,
            college: selectedCollege,
            collegeFullName: collegeInfo.name,
            course: selectedCourse,
            courseName: courseName,
            address: document.getElementById('address').value.trim(),
            dadPhone: document.getElementById('dadPhone').value.trim(),
            studentPhone: document.getElementById('studentPhone').value.trim(),
            email: document.getElementById('email').value.trim(),
            timestamp: new Date().toISOString()
        };

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generating QR...';

        try {
            // QR payload must match what admin.js expects: college = SHORT NAME,
            // course = course CODE (admin looks these up against collegesData)
            const qrData = JSON.stringify({
                id: studentData.id,
                name: studentData.name,
                regNo: studentData.regNo,
                college: collegeInfo.shortName,
                course: studentData.course,
                type: studentData.studentType,
                blood: studentData.bloodGroup
            });

            const qrDataUrl = await generateQRCodeDataUrl(qrData);

            // Save a local copy too (handy for offline testing; not relied on
            // for the manufacturing dashboard anymore - see dashboard.js)
            saveStudentData(studentData);

            // Show the QR + reset email/download status for this registration
            displayQRInModal(qrDataUrl, studentData);
            sentEmailEl.textContent = studentData.email;
            emailStatusEl.textContent = '📧 Sending your QR code by email...';
            emailStatusEl.style.color = '#667eea';
            successModal.style.display = 'block';

            // Reset form
            form.reset();
            otherBloodContainer.style.display = 'none';
            courseSelect.innerHTML = '<option value="">Select college first</option>';
            courseSelect.disabled = true;

            // Send to Apps Script in the background (logs to Sheet + emails QR)
            sendToAppsScript(studentData, qrDataUrl)
                .then(function(result) {
                    if (result && result.success) {
                        emailStatusEl.textContent = '✅ Emailed to ' + studentData.email;
                        emailStatusEl.style.color = '#28a745';
                    } else {
                        throw new Error((result && result.error) || 'Unknown error');
                    }
                })
                .catch(function(err) {
                    console.error('Apps Script send failed:', err);
                    emailStatusEl.textContent = '⚠️ Could not email your QR code automatically — please download it below instead.';
                    emailStatusEl.style.color = '#dc3545';
                });
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate QR code. Please try again.\n\nError: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register & Email My QR Code';
        }
    });

    // Send registration + QR image to the Google Apps Script Web App.
    // Uses text/plain content-type to avoid a CORS preflight request,
    // which Apps Script Web Apps don't handle well.
    function sendToAppsScript(studentData, qrDataUrl) {
        const payload = Object.assign({}, studentData, { qrImage: qrDataUrl });
        return fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        }).then(function(res) { return res.json(); });
    }

    // Generate unique student ID
    function generateStudentId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return ('STU-' + timestamp + '-' + randomStr).toUpperCase();
    }

    // Generate QR code as a data URL using qrcodejs (client-side, no server needed)
    function generateQRCodeDataUrl(text) {
        return new Promise(function(resolve, reject) {
            const tempDiv = document.createElement('div');
            new QRCode(tempDiv, {
                text: text,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });

            setTimeout(function() {
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
        // Show the already-generated QR image directly - do NOT re-encode the
        // image data URL into another QR code, it's far too long to fit
        qrCodeDisplay.innerHTML = '';
        const qrImg = document.createElement('img');
        qrImg.src = qrDataUrl;
        qrImg.alt = 'Student QR Code';
        qrImg.width = 150;
        qrImg.height = 150;
        qrCodeDisplay.appendChild(qrImg);

        qrIdEl.textContent = studentData.id;
        qrNameEl.textContent = studentData.name;

        // Reset download state for this new registration. Close is NOT gated
        // on downloading - email delivery via Apps Script is the guaranteed method.
        downloadBtn.style.display = 'inline-block';
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('downloaded');
        downloadBtn.textContent = '📥 DOWNLOAD QR CODE';
        downloadMsg.style.display = 'block';
        downloadMsg.textContent = 'Tap the button above to save the QR image to your device';
        closeSuccess.disabled = false;
        closeSuccess.textContent = 'Close';

        // Guaranteed manual fallback - opens the image directly, which works
        // even in restrictive in-app browsers where automatic downloads fail
        manualOpenLink.href = qrDataUrl;
        manualOpenLink.onclick = function() {
            markQRSaved('Opened the QR image — press and hold it, then tap "Save Image" / "Download image".');
        };

        downloadBtn.onclick = function() {
            downloadQRCode(qrDataUrl);
        };
    }

    // Helper: convert a base64 data URL into a real Blob
    function dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
    }

    function markQRSaved(message) {
        downloadBtn.textContent = '✓ DOWNLOADED';
        downloadBtn.classList.add('downloaded');
        downloadMsg.textContent = message;
    }

    // Only iOS needs the Share Sheet - it blocks silent/direct downloads.
    // Everywhere else, a real direct download works.
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS 13+
    }

    async function downloadQRCode(qrDataUrl) {
        const filename = 'QR_Code_' + qrIdEl.textContent + '.png';
        const blob = dataUrlToBlob(qrDataUrl);

        if (isIOS()) {
            try {
                const file = new File([blob], filename, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Student QR Code' });
                    markQRSaved('✅ Saved via the share menu.');
                    return;
                }
            } catch (err) {
                if (err && err.name === 'AbortError') {
                    downloadMsg.textContent = 'Cancelled — tap Download again to save your QR code.';
                    return;
                }
                console.warn('Share failed on iOS, falling back:', err);
            }
            openImageFallback(qrDataUrl, filename);
            return;
        }

        try {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 2000);
            markQRSaved('✅ QR code downloaded to your device.');
            return;
        } catch (err) {
            console.error('Direct download failed, opening image instead:', err);
        }

        openImageFallback(qrDataUrl, filename);
    }

    function openImageFallback(qrDataUrl, filename) {
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

    // Save student data to localStorage (local convenience copy only)
    function saveStudentData(data) {
        const students = JSON.parse(localStorage.getItem('students')) || [];
        students.push(Object.assign({ registeredAt: data.timestamp }, data));
        localStorage.setItem('students', JSON.stringify(students));
    }

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

    closeSuccess.addEventListener('click', function() {
        successModal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });
});
