import fs from 'fs';

function convertTextToJSON(rawText) {
    const dayMap = {
        'senin': 'monday', 'selasa': 'tuesday', 'rabu': 'wednesday',
        'kamis': 'thursday', 'jumat': 'friday', 'sabtu': 'saturday', 'minggu': 'sunday'
    };

    const result = {
        monday: [], tuesday: [], wednesday: [], 
        thursday: [], friday: [], saturday: [], sunday: []
    };

    const regex = /\d{5,}\s+(.+?)\s+[A-Z0-9\-]+\s+\d+\s+(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\s+(\d{2}):(\d{2})\s*-\s*\d{2}:\d{2}\s+([^\s]+)/gi;
    
    let match;
    while ((match = regex.exec(rawText)) !== null) {
        const matkul = match[1].trim();
        const dayIndo = match[2].toLowerCase();   
        const dayEng = dayMap[dayIndo];
        const hour = parseInt(match[3], 10);      
        const minute = parseInt(match[4], 10);    
        const ruangan = match[5].trim();

        let greeting = "pagii!";
        if (hour >= 11 && hour <= 14) {
            greeting = "siangg!";
        } else if (hour >= 15 && hour <= 18) {
            greeting = "soree!";
        } else if (hour > 18) {
            greeting = "malamm!";
        }

        result[dayEng].unshift({
            hour: hour,
            minute: minute,
            // customizable
            text: `${greeting} adaa kuliah ${matkul} di ruang ${ruangan}, kamuu jangan lupa absen yaa`,
            // TODO: dynamic link
            link: ''
            });
    }
    
    for (const day in result) {
        if (result[day].length === 0) {
            delete result[day];
        }
    }

    return JSON.stringify(result, null, 4);
}

try {
    const inputText = fs.readFileSync('./converter/rawSchedule.txt', 'utf8');
    
    const jsonOutput = convertTextToJSON(inputText);
    
    fs.writeFileSync('./config/schedule.json', jsonOutput, 'utf8');
    
    console.log("Berhasil! Silakan cek file '/config/schedule.json'");
} catch (err) {
    console.error("Terjadi kesalahan:", err.message);
}