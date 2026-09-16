document.addEventListener('DOMContentLoaded', function() {
    const startScanBtn = document.getElementById('startScan');
    const stopScanBtn = document.getElementById('stopScan');
    const manualScanBtn = document.getElementById('manualScan');
    const clearBtn = document.getElementById('clearDetails');
    const manualInput = document.getElementById('manualInput');
    const studentDetails = document.getElementById('studentDetails');
    const scanHistory = document.getElementById('scanHistory');

    let html5QrCode = null;
    let scannedStudents = [];

    // Initialize scanner
    function initScanner() {
        html5QrCode = new Html5Qrcode("reader");
    }

    // Start scanning
    startScanBtn.addEventListener('click', function() {
        if (!html5QrCode) {
            initScanner();
        }

        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanFailure
        ).then(() => {
            startScanBtn.style.display = 'none';
            stopScanBtn.style.display = 'inline-block';
        }).catch(err => {
            alert('Unable to start camera. Please ensure camera permissions are granted.\n\nError: ' + err);
        });
    });

    // Stop scanning
    stopScanBtn.addEventListener('click', function() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                startScanBtn.style.display = 'inline-block';
                stopScanBtn.style.display = 'none';
            }).catch(err => {
                console.error('Error stopping scanner:', err);
            });
        }
    });

    // Handle successful scan
    function onScanSuccess(decodedText) {
        try {
            // Stop scanner after successful scan
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop();
                startScanBtn.style.display = 'inline-block';
                stopScanBtn.style.display = 'none';
            }

            // Parse QR data
            const studentData = JSON.parse(decodedText);
            displayStudentDetails(studentData);
            addToHistory(studentData);
        } catch (error) {
            alert('Invalid QR code format. Please scan a valid student QR code.');
        }
    }

    // Handle scan failure
    function onScanFailure(error) {
        // Silently handle scan failures (continuous scanning)
    }

    // Manual entry processing
    manualScanBtn.addEventListener('click', function() {
        const inputData = manualInput.value.trim();
        if (!inputData) {
            alert('Please paste QR code data first.');
            return;
        }

        try {
            const studentData = JSON.parse(inputData);
            displayStudentDetails(studentData);
            addToHistory(studentData);
            manualInput.value = '';
        } catch (error) {
            alert('Invalid JSON data. Please paste valid QR code data.');
        }
    });

    // Display student details
    function displayStudentDetails(data) {
        // Find full college name
        let collegeName = data.college;
        for (const key in collegesData) {
            if (collegesData[key].shortName === data.college) {
                collegeName = collegesData[key].name;
                break;
            }
        }

        // Find full course name
        let courseName = data.course;
        const collegeKey = Object.keys(collegesData).find(k => 
            collegesData[k].shortName === data.college
        );
        if (collegeKey) {
            const course = collegesData[collegeKey].courses.find(c => c.code === data.course);
            if (course) {
                courseName = `${data.course} - ${course.name}`;
            }
        }

        // Update display
        document.getElementById('detailId').textContent = data.id || 'N/A';
        document.getElementById('detailName').textContent = data.name;
        document.getElementById('detailRegNo').textContent = data.regNo;
        document.getElementById('detailCollege').textContent = collegeName;
        document.getElementById('detailCourse').textContent = courseName;
        document.getElementById('detailType').textContent = data.type === 'hosteller' ? 'Hosteller' : 'Day Scholar';
        document.getElementById('detailBlood').textContent = data.blood;

        // Show details section
        studentDetails.style.display = 'block';
        studentDetails.scrollIntoView({ behavior: 'smooth' });

        // Play success sound (optional)
        playSuccessSound();
    }

    // Add to scan history
    function addToHistory(data) {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        
        // Find college short name for display
        let collegeShort = data.college;
        for (const key in collegesData) {
            if (collegesData[key].shortName === data.college) {
                collegeShort = collegesData[key].shortName;
                break;
            }
        }

        scannedStudents.unshift({
            ...data,
            scanTime: timeString,
            collegeDisplay: collegeShort
        });

        // Keep only last 10 scans
        if (scannedStudents.length > 10) {
            scannedStudents.pop();
        }

        updateHistoryDisplay();
    }

    // Update history display
    function updateHistoryDisplay() {
        if (scannedStudents.length === 0) {
            scanHistory.innerHTML = '<p class="no-scans">No scans yet</p>';
            return;
        }

        scanHistory.innerHTML = scannedStudents.map(student => `
            <div class="history-item">
                <div class="history-info">
                    <strong>${student.name}</strong>
                    <span class="history-detail">${student.regNo} | ${student.collegeDisplay} | ${student.course}</span>
                </div>
                <span class="history-time">${student.scanTime}</span>
            </div>
        `).join('');
    }

    // Clear details
    clearBtn.addEventListener('click', function() {
        studentDetails.style.display = 'none';
        document.getElementById('detailId').textContent = '';
        document.getElementById('detailName').textContent = '';
        document.getElementById('detailRegNo').textContent = '';
        document.getElementById('detailCollege').textContent = '';
        document.getElementById('detailCourse').textContent = '';
        document.getElementById('detailType').textContent = '';
        document.getElementById('detailBlood').textContent = '';
    });

    // Play success sound
    function playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
            }, 150);
        } catch (e) {
            // Audio not supported, silently fail
        }
    }

    // Load existing students from localStorage
    function loadExistingStudents() {
        const students = JSON.parse(localStorage.getItem('students')) || [];
        // Display count
        console.log(`${students.length} registered students found in system`);
    }

    loadExistingStudents();
});
