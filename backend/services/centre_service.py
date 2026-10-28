"""Support Centre Service.

Manages autism diagnostic, therapeutic, and counseling centers.
Provides geo-coordinates for Leaflet / OpenStreetMap mapping.
Calculates geodesic proximity (Haversine) in kilometers.
"""
import math
from typing import List, Dict, Any, Optional
from backend.models.support_centre import SupportCentre
from backend.extensions import db


def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth in kilometers."""
    r = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)


class SupportCentreService:
    """Service managing autism diagnostic and intervention center directory."""

    SEED_CENTRES = [
        # BENGALURU & SOUTHERN REGION
        {
            "name": "NIMHANS Center for Autism Research and Services",
            "facility_type": "Apex Neuro-Psychiatric Institute",
            "address": "Hosur Road, Lakkasandra, Bengaluru",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560029",
            "latitude": 12.9392,
            "longitude": 77.5959,
            "phone": "+91 80 2699 5000",
            "email": "autismcare@nimhans.ac.in",
            "website": "https://nimhans.ac.in",
            "services_offered": "Multidisciplinary Evaluation, MRI Neuroimaging Correlation, Sensory Integration, Speech Therapy",
        },
        {
            "name": "Manipal Hospital Child Development & Neuro Center",
            "facility_type": "Pediatric Specialty Hospital",
            "address": "98 HAL Old Airport Road, Kodihalli, Bengaluru",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560017",
            "latitude": 12.9592,
            "longitude": 77.6534,
            "phone": "+91 80 2502 4444",
            "email": "pediatrics@manipalhospitals.com",
            "website": "https://manipalhospitals.com",
            "services_offered": "Developmental Pediatrics, Autism Diagnosis, Clinical Neuropsychology, Occupational Therapy",
        },
        {
            "name": "Aster CMI Child Neurodevelopment Clinic",
            "facility_type": "Super Specialty Pediatric Center",
            "address": "No. 43/2, New Airport Road, NH 44, Sahakar Nagar, Bengaluru",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560092",
            "latitude": 13.0617,
            "longitude": 77.5929,
            "phone": "+91 80 4345 4345",
            "email": "cmi.pediatrics@asterhospital.com",
            "website": "https://asterhospitals.in",
            "services_offered": "Pediatric Neurology, Early Autism Screening, Speech & Swallowing Rehabilitation",
        },
        {
            "name": "All India Institute of Speech and Hearing (AIISH)",
            "facility_type": "National Apex Communication Disorders Institute",
            "address": "Naimisham Campus, Manasagangothri, Mysuru",
            "city": "Mysuru",
            "state": "Karnataka",
            "postal_code": "570006",
            "latitude": 12.3082,
            "longitude": 76.6346,
            "phone": "+91 821 250 2000",
            "email": "aiish_director@aiishmysore.in",
            "website": "https://aiishmysore.in",
            "services_offered": "Audiological Evaluation, Speech Language Pathology, Autism Behavioral Intervention, Special Education",
        },
        {
            "name": "Kovai Medical Center Child Development & Autism Unit",
            "facility_type": "Multi-Disciplinary Healthcare Center",
            "address": "Post Box No. 3209, Avinashi Road, Coimbatore",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "postal_code": "641014",
            "latitude": 11.0543,
            "longitude": 77.0396,
            "phone": "+91 422 432 3800",
            "email": "childhealth@kmchhospitals.com",
            "website": "https://kmchhospitals.com",
            "services_offered": "Developmental Pediatric Evaluation, Sensory Integration, Physical & Behavior Therapy",
        },
        {
            "name": "Apollo Children's Hospital Developmental Clinic",
            "facility_type": "Tertiary Pediatric Hospital",
            "address": "15, Shafee Mohammed Road, Thousand Lights West, Chennai",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "postal_code": "600006",
            "latitude": 13.0592,
            "longitude": 80.2520,
            "phone": "+91 44 2829 8282",
            "email": "children@apollohospitals.com",
            "website": "https://chennai.apollohospitals.com",
            "services_offered": "Pediatric Neurology, Neuroimaging Assessment, Behavioral Therapy, Occupational Therapy",
        },
        {
            "name": "VHS Child Development & Autism Clinic",
            "facility_type": "Non-Profit Multispecialty Hospital",
            "address": "Rajiv Gandhi Salai, TTTI Post, Taramani, Chennai",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "postal_code": "600113",
            "latitude": 12.9866,
            "longitude": 80.2458,
            "phone": "+91 44 2254 1972",
            "email": "autismcentre@vhschennai.org",
            "website": "https://vhschennai.org",
            "services_offered": "Comprehensive Autism Screening, Cognitive Training, Family Counseling, Early Intervention",
        },
        {
            "name": "Aster Medcity Child Neurodevelopmental Center",
            "facility_type": "Quaternary Care Hospital",
            "address": "Kuttisahib Road, Cheranalloor, South Chittoor, Kochi",
            "city": "Kochi",
            "state": "Kerala",
            "postal_code": "682027",
            "latitude": 10.0559,
            "longitude": 76.2755,
            "phone": "+91 484 669 9999",
            "email": "pediatrics@astermedcity.com",
            "website": "https://astermedcity.com",
            "services_offered": "Developmental Pediatrics, MRI Correlation, Autism Early Intervention, Speech Therapy",
        },
        {
            "name": "CDC - Child Development Centre, Medical College",
            "facility_type": "Government Child Healthcare Institute",
            "address": "Medical College P.O., Thiruvananthapuram",
            "city": "Thiruvananthapuram",
            "state": "Kerala",
            "postal_code": "695011",
            "latitude": 8.5241,
            "longitude": 76.9248,
            "phone": "+91 471 244 4589",
            "email": "cdckerala@rediffmail.com",
            "website": "http://cdckerala.org",
            "services_offered": "Early Autism Detection, Neurodevelopmental Follow-up, Genetic Counseling, Clinical Psychology",
        },
        {
            "name": "Rainbow Children's Hospital & BirthRight",
            "facility_type": "Dedicated Pediatric Care Center",
            "address": "Road No. 2, Banjara Hills, Hyderabad",
            "city": "Hyderabad",
            "state": "Telangana",
            "postal_code": "500034",
            "latitude": 17.4208,
            "longitude": 78.4487,
            "phone": "+91 40 4246 2200",
            "email": "info@rainbowhospitals.in",
            "website": "https://rainbowhospitals.in",
            "services_offered": "Pediatric Neurology, Developmental Milestones Assessment, Autism Behavioral Therapy",
        },
        {
            "name": "Niloufer Hospital Child Guidance Clinic",
            "facility_type": "Government Pediatric Teaching Hospital",
            "address": "Red Hills, Lakdikapul, Hyderabad",
            "city": "Hyderabad",
            "state": "Telangana",
            "postal_code": "500004",
            "latitude": 17.3995,
            "longitude": 78.4682,
            "phone": "+91 40 2339 4240",
            "email": "niloufer@telangana.gov.in",
            "website": "https://niloufer.telangana.gov.in",
            "services_offered": "Developmental Pediatrics, ISAA Diagnostic Testing, Early Stimulation Programs",
        },

        # NORTHERN REGION
        {
            "name": "Action For Autism (AFA) - The National Centre for Autism",
            "facility_type": "Specialized Autism Care & Education",
            "address": "Pocket 7 & 8, Jasola Vihar, New Delhi",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110025",
            "latitude": 28.5398,
            "longitude": 77.2917,
            "phone": "+91 11 4054 0991",
            "email": "info@autism-india.org",
            "website": "http://www.autism-india.org",
            "services_offered": "Diagnostic Screening, Early Intervention, Occupational Therapy, Parent Counseling",
        },
        {
            "name": "AIIMS Pediatric Neurology & Child Guidance Center",
            "facility_type": "Apex National Medical Institute",
            "address": "Ansari Nagar, Sri Aurobindo Marg, New Delhi",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110029",
            "latitude": 28.5672,
            "longitude": 77.2100,
            "phone": "+91 11 2658 8500",
            "email": "pediatrics@aiims.edu",
            "website": "https://aiims.edu",
            "services_offered": "Pediatric Neurology, Advanced Neuroimaging Correlation, Autism Diagnostic Evaluation",
        },
        {
            "name": "Medanta Child Development Center",
            "facility_type": "Multi-Super Specialty Institute",
            "address": "CH Bakhtawar Singh Road, Sector 38, Gurugram",
            "city": "Gurugram",
            "state": "Haryana",
            "postal_code": "122001",
            "latitude": 28.4395,
            "longitude": 77.0423,
            "phone": "+91 124 414 1414",
            "email": "info@medanta.org",
            "website": "https://medanta.org",
            "services_offered": "Developmental Pediatrics, Autism Therapy, Child Psychology, Sensory Gym",
        },
        {
            "name": "PRAYAS - Center for Special Children & Autism Clinic",
            "facility_type": "Therapy & Special Education",
            "address": "Sector 38, Chandigarh",
            "city": "Chandigarh",
            "state": "Chandigarh",
            "postal_code": "160036",
            "latitude": 30.7410,
            "longitude": 76.7450,
            "phone": "+91 172 269 8000",
            "email": "prayas@chandigarhcare.org",
            "website": "https://prayasautism.org",
            "services_offered": "Behavioral Intervention, Speech & Language Pathology, Parent Guidance Groups",
        },
        {
            "name": "PGIMER Child & Adolescent Psychiatry Unit",
            "facility_type": "Postgraduate Medical Institute",
            "address": "Madhya Marg, Sector 12, Chandigarh",
            "city": "Chandigarh",
            "state": "Chandigarh",
            "postal_code": "160012",
            "latitude": 30.7651,
            "longitude": 76.7749,
            "phone": "+91 172 274 7585",
            "email": "childpsychiatry@pgimer.edu.in",
            "website": "https://pgimer.edu.in",
            "services_offered": "Autism Diagnostic Assessment, Pediatric Neuropsychiatry, Cognitive Behavioral Therapy",
        },
        {
            "name": "Fortis Escorts Pediatric Neurodevelopment Clinic",
            "facility_type": "Specialty Hospital",
            "address": "Jawaharlal Nehru Marg, Malviya Nagar, Jaipur",
            "city": "Jaipur",
            "state": "Rajasthan",
            "postal_code": "302017",
            "latitude": 26.8529,
            "longitude": 75.8058,
            "phone": "+91 141 254 7000",
            "email": "jaipur.care@fortishealthcare.com",
            "website": "https://fortishealthcare.com",
            "services_offered": "Developmental Pediatrics, Autism Early Triage, Occupational and Speech Therapy",
        },
        {
            "name": "SGPGI Pediatric Neurology & Development Center",
            "facility_type": "Autonomous State Medical Institute",
            "address": "New PMSSY Complex, Raebareli Road, Lucknow",
            "city": "Lucknow",
            "state": "Uttar Pradesh",
            "postal_code": "226014",
            "latitude": 26.7483,
            "longitude": 80.9388,
            "phone": "+91 522 266 8004",
            "email": "pedneurology@sgpgi.ac.in",
            "website": "https://sgpgi.ac.in",
            "services_offered": "Pediatric Neurology, Advanced Neuroimaging Evaluation, Multidisciplinary Autism Care",
        },

        # WESTERN REGION
        {
            "name": "Ummeed Child Development Center",
            "facility_type": "Child Developmental Clinic",
            "address": "1-B, 1/62 Mantri Pride, Subhash Nagar, Nahur West, Mumbai",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400078",
            "latitude": 19.1553,
            "longitude": 72.9391,
            "phone": "+91 22 6248 8100",
            "email": "contact@ummeed.org",
            "website": "https://ummeed.org",
            "services_offered": "Developmental Pediatrics, Autism Diagnostic Observation, Behavioral Therapy",
        },
        {
            "name": "Kokilaben Dhirubhai Ambani Hospital Center for Child Development",
            "facility_type": "Quaternary Care Hospital",
            "address": "Rao Saheb Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400053",
            "latitude": 19.1311,
            "longitude": 72.8252,
            "phone": "+91 22 4269 6969",
            "email": "childdev@kokilabenhospitals.com",
            "website": "https://kokilabenhospital.com",
            "services_offered": "Pediatric Neurology, Comprehensive Autism Evaluation, Sensory Integration Therapy",
        },
        {
            "name": "KEM Hospital Child Development & Autism Unit",
            "facility_type": "Multispecialty Hospital & Research Institute",
            "address": "489-490, Rasta Peth, Sardar Moodliar Road, Pune",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411011",
            "latitude": 18.5204,
            "longitude": 73.8732,
            "phone": "+91 20 2621 7300",
            "email": "pediatrics@kempune.org",
            "website": "https://kempune.org",
            "services_offered": "Developmental Assessment, Behavioral Pediatrics, Occupational Therapy, Parent Guidance",
        },
        {
            "name": "Apollo Hospitals Child Health Center",
            "facility_type": "Super Specialty Hospital",
            "address": "Swaminarayan Nagar, Panchavati, Nashik",
            "city": "Nashik",
            "state": "Maharashtra",
            "postal_code": "422003",
            "latitude": 20.0110,
            "longitude": 73.7903,
            "phone": "+91 253 230 3000",
            "email": "nashik@apollohospitals.com",
            "website": "https://nashik.apollohospitals.com",
            "services_offered": "Pediatric Health, Early Autism Intervention, Speech and Motor Skills Rehabilitation",
        },
        {
            "name": "Sunshine Global Hospital Pediatric Center",
            "facility_type": "Multi-Specialty Care Hospital",
            "address": "Dumas Road, Piplod, Surat",
            "city": "Surat",
            "state": "Gujarat",
            "postal_code": "395007",
            "latitude": 21.1702,
            "longitude": 72.8311,
            "phone": "+91 261 408 8888",
            "email": "care@sunshineglobalhospitals.com",
            "website": "https://sunshineglobalhospitals.com",
            "services_offered": "Child Development Clinic, Sensory Integration, Speech Therapy, Behavioral Support",
        },
        {
            "name": "Apollo Hospitals Child Neurodevelopment Center",
            "facility_type": "Super Specialty Hospital",
            "address": "Plot No. 1A, Bhat GIDC Estate, Gandhinagar Highway, Ahmedabad",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "postal_code": "382428",
            "latitude": 23.1118,
            "longitude": 72.6026,
            "phone": "+91 79 6670 1800",
            "email": "apollo_ahmedabad@apollohospitals.com",
            "website": "https://ahmedabad.apollohospitals.com",
            "services_offered": "Pediatric Neurology, MRI Correlation, Autism Diagnostic Screening, Cognitive Therapy",
        },

        # EASTERN REGION
        {
            "name": "Institute of Child Health Autism & Neurodevelopment Clinic",
            "facility_type": "Premier Pediatric Institute",
            "address": "11, Dr. Biresh Guha Street, Park Circus, Kolkata",
            "city": "Kolkata",
            "state": "West Bengal",
            "postal_code": "700017",
            "latitude": 22.5392,
            "longitude": 88.3644,
            "phone": "+91 33 2287 4585",
            "email": "ichkolkata@gmail.com",
            "website": "https://ichkolkata.org",
            "services_offered": "Developmental Pediatrics, Autism Assessment, Sensory Integration, Clinical Psychology",
        },
        {
            "name": "AMRI Children's Hospital Developmental Care Unit",
            "facility_type": "Specialty Children's Hospital",
            "address": "230 Barakhola Lane, Purba Jadavpur, Mukundapur, Kolkata",
            "city": "Kolkata",
            "state": "West Bengal",
            "postal_code": "700099",
            "latitude": 22.4988,
            "longitude": 88.3986,
            "phone": "+91 33 6680 0000",
            "email": "amrikolkata@amrihospitals.in",
            "website": "https://amrihospitals.in",
            "services_offered": "Pediatric Neurology, Early Autism Screening, Speech Pathology, Occupational Therapy",
        },
        {
            "name": "AIIMS Bhubaneswar Child Health & Development Center",
            "facility_type": "Apex National Medical Institute",
            "address": "Sijua, Patrapada, Bhubaneswar",
            "city": "Bhubaneswar",
            "state": "Odisha",
            "postal_code": "751019",
            "latitude": 20.2312,
            "longitude": 85.7766,
            "phone": "+91 674 247 6789",
            "email": "pediatrics@aiimsbhubaneswar.edu.in",
            "website": "https://aiimsbhubaneswar.nic.in",
            "services_offered": "Pediatric Neurology, Autism Diagnostic Assessment, Early Childhood Intervention",
        },
    ]

    @classmethod
    def seed_initial_centres(cls) -> int:
        """Seed or synchronize initial centers into the database if missing."""
        seeded_count = 0
        for item in cls.SEED_CENTRES:
            existing = SupportCentre.query.filter_by(name=item["name"]).first()
            if not existing:
                centre = SupportCentre(**item)
                db.session.add(centre)
                seeded_count += 1
        if seeded_count > 0:
            db.session.commit()
        return seeded_count

    @classmethod
    def list_centres(
        cls,
        city: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        max_distance_km: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve centers, optionally filtered by city or geographic radius in km."""
        cls.seed_initial_centres()
        query = SupportCentre.query
        if city:
            query = query.filter(SupportCentre.city.ilike(f"%{city}%"))
        centres = query.all()

        results = []
        for c in centres:
            c_dict = c.to_dict()
            if lat is not None and lng is not None and c.latitude and c.longitude:
                dist = calculate_haversine_km(lat, lng, c.latitude, c.longitude)
                c_dict["distance_km"] = dist
            results.append(c_dict)

        # Proximity sort if coordinates provided
        if lat is not None and lng is not None:
            results.sort(key=lambda x: x.get("distance_km", float("inf")))
            if max_distance_km is not None and max_distance_km > 0:
                results = [r for r in results if r.get("distance_km", float("inf")) <= max_distance_km]

        return results
