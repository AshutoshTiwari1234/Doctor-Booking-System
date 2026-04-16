// src/data/doctors.jsx

const generateDynamicSlots = () => {
  const slots = {};
  const today = new Date();
  const masterTimes = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", 
    "11:00 AM", "11:30 AM", "12:00 PM", "02:00 PM", 
    "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", 
    "04:30 PM", "05:00 PM"
  ];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateKey = d.toISOString().split("T")[0];

    const slotCount = Math.floor(Math.random() * 5) + 4; 
    
    const daySlots = [...masterTimes]
      .sort(() => 0.5 - Math.random())
      .slice(0, slotCount)       
      .sort((a, b) => {                
        return masterTimes.indexOf(a) - masterTimes.indexOf(b);
      });

    slots[dateKey] = daySlots;
  }
  return slots;
};

export const doctors = [
  {
    id: 1,
    name: "Dr. Priya Sharma",
    specialty: "Cardiologist",
    experience: "14 years",
    rating: 4.9,
    reviews: 312,
    fee: 800,
    hospital: "Apollo Heart Institute",
    location: "Delhi",
    available: true,
    nextSlot: "Today, 2:00 PM",
    avatar: "👩‍⚕️",
    color: "#dbeafe",
    about:
      "Dr. Priya Sharma is a board-certified cardiologist with expertise in interventional cardiology, heart failure management, and preventive cardiology. She has performed over 2,000 cardiac procedures.",
    languages: ["English", "Hindi"],
    education: "AIIMS Delhi, DM Cardiology",
    slots: generateDynamicSlots(),
  },
  {
    id: 2,
    name: "Dr. Arjun Mehta",
    specialty: "Dermatologist",
    experience: "9 years",
    rating: 4.8,
    reviews: 245,
    fee: 600,
    hospital: "Skin & Wellness Clinic",
    location: "Mumbai",
    available: true,
    nextSlot: "Today, 4:30 PM",
    avatar: "👨‍⚕️",
    color: "#ccfbf1",
    about:
      "Dr. Arjun Mehta specializes in cosmetic and medical dermatology, treating conditions like acne, eczema, psoriasis, and performing advanced skin rejuvenation procedures.",
    languages: ["English", "Hindi", "Marathi"],
    education: "KEM Hospital Mumbai, MD Dermatology",
    slots: generateDynamicSlots(),
  },
  {
    id: 3,
    name: "Dr. Kavita Nair",
    specialty: "Gynecologist",
    experience: "18 years",
    rating: 4.9,
    reviews: 480,
    fee: 900,
    hospital: "Fortis Women's Health",
    location: "Bangalore",
    available: true,
    nextSlot: "Tomorrow, 10:00 AM",
    avatar: "👩‍⚕️",
    color: "#fce7f3",
    about:
      "Dr. Kavita Nair is a renowned obstetrician and gynecologist with special interest in high-risk pregnancies, laparoscopic surgery, and women's reproductive health.",
    languages: ["English", "Hindi", "Kannada", "Malayalam"],
    education: "JIPMER, MS Obstetrics & Gynecology",
    slots: generateDynamicSlots(),
  },
  {
    id: 4,
    name: "Dr. Rahul Gupta",
    specialty: "Orthopedic Surgeon",
    experience: "12 years",
    rating: 4.7,
    reviews: 198,
    fee: 1000,
    hospital: "Max Orthopedic Center",
    location: "Noida",
    available: true,
    nextSlot: "Today, 5:00 PM",
    avatar: "👨‍⚕️",
    color: "#fef3c7",
    about:
      "Dr. Rahul Gupta is an orthopedic surgeon specializing in joint replacement surgery, sports injuries, and spine disorders. He uses minimally invasive techniques for faster recovery.",
    languages: ["English", "Hindi"],
    education: "Maulana Azad Medical College, MS Orthopedics",
    slots: generateDynamicSlots(),
  },
  {
    id: 5,
    name: "Dr. Sunita Rao",
    specialty: "Neurologist",
    experience: "16 years",
    rating: 4.8,
    reviews: 267,
    fee: 1100,
    hospital: "NIMHANS Neurology Center",
    location: "Bangalore",
    available: false,
    nextSlot: "Thu, 11:00 AM",
    avatar: "👩‍⚕️",
    color: "#ede9fe",
    about:
      "Dr. Sunita Rao is a neurologist with expertise in epilepsy, stroke management, headache disorders, and neurodegenerative diseases like Parkinson's and Alzheimer's.",
    languages: ["English", "Hindi", "Kannada"],
    education: "NIMHANS Bangalore, DM Neurology",
    slots: generateDynamicSlots(),
  },
  {
    id: 6,
    name: "Dr. Vikram Singh",
    specialty: "Pediatrician",
    experience: "11 years",
    rating: 4.9,
    reviews: 420,
    fee: 550,
    hospital: "Rainbow Children's Hospital",
    location: "Hyderabad",
    available: true,
    nextSlot: "Today, 3:00 PM",
    avatar: "👨‍⚕️",
    color: "#dcfce7",
    about:
      "Dr. Vikram Singh is a compassionate pediatrician specializing in child development, vaccinations, neonatal care, and management of childhood illnesses and allergies.",
    languages: ["English", "Hindi", "Telugu"],
    education: "Osmania Medical College, MD Pediatrics",
    slots: generateDynamicSlots(),
  },
];

export const specialties = [
  "All Specialties",
  "Cardiologist",
  "Dermatologist",
  "Gynecologist",
  "Orthopedic Surgeon",
  "Neurologist",
  "Pediatrician",
];