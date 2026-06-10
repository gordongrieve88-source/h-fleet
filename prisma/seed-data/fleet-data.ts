// AUTO-GENERATED from 'HMA Metro Roster June 2026 Copy.xlsm' — real data, cleaned.
// Self-contained: the row shapes live here so the seed has no app imports.

export type Region = string;
export interface Plant { name: string; region: Region }
export interface Driver { id: string; name: string; emp: string; plant: string; workgroup: string }
export interface Truck { id: string; plant: string; region: Region; defaultDriverId: string | null }
export interface Assignment { truck: string; status: string; time: string; driverId: string | null }
export interface DayBoard { date: string; assignments: Assignment[] }
export interface Leave { id: string; driverId: string; type: string; start: string; end: string }

export const REGIONS: Region[] = ["Projects", "Metro East", "Metro West", "Metro Central"];

export const PLANTS: Plant[] = [
{
"name": "Greenacre Project",
"region": "Projects"
},
{
"name": "Pyrmont Project",
"region": "Projects"
},
{
"name": "Banksmeadow Project",
"region": "Projects"
},
{
"name": "Wetherill Project",
"region": "Projects"
},
{
"name": "Greenacre Metro",
"region": "Projects"
},
{
"name": "Artarmon Metro",
"region": "Metro East"
},
{
"name": "Banksmeadow Metro",
"region": "Metro East"
},
{
"name": "Brookvale Metro",
"region": "Metro East"
},
{
"name": "Caringbah METRO",
"region": "Metro East"
},
{
"name": "Pyrmont Metro",
"region": "Metro East"
},
{
"name": "Campbelltown Metro",
"region": "Metro West"
},
{
"name": "Prestons Metro",
"region": "Metro West"
},
{
"name": "Wetherill Metro",
"region": "Metro West"
},
{
"name": "Camellia Metro",
"region": "Metro Central"
},
{
"name": "Girraween Metro",
"region": "Metro Central"
},
{
"name": "Riverstone Metro",
"region": "Metro Central"
},
{
"name": "Thornleigh Metro",
"region": "Metro Central"
}
];

export const DRIVERS: Driver[] = [
{
"id": "d1",
"name": "Abdullah Arnaout",
"emp": "1",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d2",
"name": "Adam Furley",
"emp": "2",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d3",
"name": "Adam Youne",
"emp": "3",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d4",
"name": "Ahmad Alassadi",
"emp": "4",
"plant": "Caringbah",
"workgroup": "LOD"
},
{
"id": "d5",
"name": "Alberto Mancuso",
"emp": "5",
"plant": "Wetherill park",
"workgroup": "Project"
},
{
"id": "d6",
"name": "Aleksandar Bedelovski",
"emp": "6",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d7",
"name": "Alexander Celik",
"emp": "7",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d8",
"name": "Ali Qarqour",
"emp": "8",
"plant": "Caringbah",
"workgroup": "LOD"
},
{
"id": "d9",
"name": "Ali Zaher",
"emp": "9",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d10",
"name": "Amandeep Singh",
"emp": "10",
"plant": "Greenacre",
"workgroup": "LOD relief"
},
{
"id": "d11",
"name": "Andrew Pettit",
"emp": "11",
"plant": "Brookvale",
"workgroup": "Metro"
},
{
"id": "d12",
"name": "Angelo Vitale",
"emp": "12",
"plant": "Campbelltown",
"workgroup": "LOD"
},
{
"id": "d13",
"name": "Ankit Kumar",
"emp": "13",
"plant": "Girraween",
"workgroup": "Metro"
},
{
"id": "d14",
"name": "Anthony Rozos",
"emp": "14",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d15",
"name": "Anthony Swan",
"emp": "15",
"plant": "Banksmeadow",
"workgroup": "Project"
},
{
"id": "d16",
"name": "Antoni Maciejczyk",
"emp": "16",
"plant": "Girraween",
"workgroup": "Metro"
},
{
"id": "d17",
"name": "Antonio Pelosi",
"emp": "17",
"plant": "Banksmeadow",
"workgroup": "LOD"
},
{
"id": "d18",
"name": "Aubery (Leroy) Thambyah",
"emp": "18",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d19",
"name": "Badros Badros",
"emp": "19",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d20",
"name": "Bassam Jawish",
"emp": "20",
"plant": "Campbelltown",
"workgroup": "Metro"
},
{
"id": "d21",
"name": "Ben Taufua",
"emp": "21",
"plant": "Greenacre",
"workgroup": "LOD relief"
},
{
"id": "d22",
"name": "Ben Wagstaff",
"emp": "22",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d23",
"name": "Bhupinder Singh",
"emp": "23",
"plant": "Wetherill park",
"workgroup": "Project"
},
{
"id": "d24",
"name": "Bill Aifantis",
"emp": "24",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d25",
"name": "Blake Mason",
"emp": "25",
"plant": "Girraween",
"workgroup": "Metro"
},
{
"id": "d26",
"name": "Bogoja Najdoski",
"emp": "26",
"plant": "Banksmeadow",
"workgroup": "LOD"
},
{
"id": "d27",
"name": "Borce Naumovski (Bobby)",
"emp": "27",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d28",
"name": "Brad Riddle",
"emp": "28",
"plant": "Thornleigh",
"workgroup": "LOD"
},
{
"id": "d29",
"name": "Branislav (Rob) Ognjanovic",
"emp": "29",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d30",
"name": "Brenden Chetcuti",
"emp": "30",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d31",
"name": "Brett Walker",
"emp": "31",
"plant": "Banksmeadow",
"workgroup": "Project"
},
{
"id": "d32",
"name": "Bulgan Jargalsaikhan",
"emp": "32",
"plant": "Caringbah",
"workgroup": "Metro"
},
{
"id": "d33",
"name": "Carmine Capobianco",
"emp": "33",
"plant": "Banksmeadow",
"workgroup": "LOD"
},
{
"id": "d34",
"name": "Caroline Taufua",
"emp": "34",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d35",
"name": "Chafic Charlie Saghabi",
"emp": "35",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d36",
"name": "Chandri (Janak) Palihawadana",
"emp": "36",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d37",
"name": "Charlie Azzi",
"emp": "37",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d38",
"name": "Chi Ngo",
"emp": "38",
"plant": "Prestons",
"workgroup": "Project"
},
{
"id": "d39",
"name": "Christopher Chapman",
"emp": "39",
"plant": "Banksmeadow",
"workgroup": "Metro"
},
{
"id": "d40",
"name": "Christopher McGrory",
"emp": "40",
"plant": "Girraween",
"workgroup": "Metro"
},
{
"id": "d41",
"name": "Daniel Micallef",
"emp": "41",
"plant": "Campbelltown",
"workgroup": "LOD"
},
{
"id": "d42",
"name": "Daniel Zamprogno",
"emp": "42",
"plant": "Wetherill Park",
"workgroup": "Project"
},
{
"id": "d43",
"name": "Darwin Darwin",
"emp": "43",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d44",
"name": "David Fieldus",
"emp": "44",
"plant": "Thornleigh",
"workgroup": "LOD"
},
{
"id": "d45",
"name": "David Pickles",
"emp": "45",
"plant": "Riverstone",
"workgroup": "LOD"
},
{
"id": "d46",
"name": "David Quang",
"emp": "46",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d47",
"name": "Denis Jovic",
"emp": "47",
"plant": "Greenacre",
"workgroup": "Leading Hand"
},
{
"id": "d48",
"name": "Dimce Jankovski",
"emp": "48",
"plant": "Thornleigh",
"workgroup": "Metro"
},
{
"id": "d49",
"name": "Dimce Nackovski",
"emp": "49",
"plant": "Artarmon",
"workgroup": "LOD relief"
},
{
"id": "d50",
"name": "Dimitri Ferreira",
"emp": "50",
"plant": "Banksmeadow",
"workgroup": "LOD"
},
{
"id": "d51",
"name": "Dinh Nguyen",
"emp": "51",
"plant": "Greenacre",
"workgroup": "LOD relief"
},
{
"id": "d52",
"name": "Dominic Rodi",
"emp": "52",
"plant": "Wetherill Park",
"workgroup": "Project"
},
{
"id": "d53",
"name": "Dragan Trenkoski (Darren)",
"emp": "53",
"plant": "Prestons",
"workgroup": "Driver Assessor"
},
{
"id": "d54",
"name": "Dung Nguyen",
"emp": "54",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d55",
"name": "Elango Lakshmanan",
"emp": "55",
"plant": "Girraween",
"workgroup": "Metro"
},
{
"id": "d56",
"name": "Ellie Woollard",
"emp": "56",
"plant": "Brookvale",
"workgroup": "Metro"
},
{
"id": "d57",
"name": "Ethan Wiki",
"emp": "57",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d58",
"name": "Fabian Legaizamon",
"emp": "58",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d59",
"name": "Farrell Maka",
"emp": "59",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d60",
"name": "Faud Buksh",
"emp": "60",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d61",
"name": "Fernando Ribeiro de Lima",
"emp": "61",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d62",
"name": "Fiona Triklis",
"emp": "62",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d63",
"name": "Gabriel Cross",
"emp": "63",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d64",
"name": "Gagandeep Singh",
"emp": "64",
"plant": "Greenacre",
"workgroup": "LOD relief"
},
{
"id": "d65",
"name": "George Wood",
"emp": "65",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d66",
"name": "Giorgi Janjgava",
"emp": "66",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d67",
"name": "Giuseppe Oliveri",
"emp": "67",
"plant": "Wetherill Park",
"workgroup": "Project"
},
{
"id": "d68",
"name": "Guoliang Yao",
"emp": "68",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d69",
"name": "Guriqbal Singh",
"emp": "69",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d70",
"name": "Gurpal Singh",
"emp": "70",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d71",
"name": "Hamza Demir",
"emp": "71",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d72",
"name": "Harminder Parmar",
"emp": "72",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d73",
"name": "Harsimran Singh",
"emp": "73",
"plant": "Pyrmont",
"workgroup": "LOD"
},
{
"id": "d74",
"name": "Hasan Mahmud",
"emp": "74",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d75",
"name": "Hayden Marquez",
"emp": "75",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d76",
"name": "Hoang Giang Dinh",
"emp": "76",
"plant": "Greenacre",
"workgroup": "LOD relief"
},
{
"id": "d77",
"name": "Hoang Long Dang",
"emp": "77",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d78",
"name": "Ingrid Smith",
"emp": "78",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d79",
"name": "Jagat Thapa",
"emp": "79",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d80",
"name": "Jalal Arabi",
"emp": "80",
"plant": "Pyrmont",
"workgroup": "LOD"
},
{
"id": "d81",
"name": "Jason Hillsley",
"emp": "81",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d82",
"name": "Jaspal  Bajwa",
"emp": "82",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d83",
"name": "Jeff Beesley",
"emp": "83",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d84",
"name": "Joel Walker",
"emp": "84",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d85",
"name": "John Foreman",
"emp": "85",
"plant": "Caringbah",
"workgroup": "Metro"
},
{
"id": "d86",
"name": "John Heffernan",
"emp": "86",
"plant": "Banksmeadow",
"workgroup": "Metro"
},
{
"id": "d87",
"name": "Joseph Ferreira",
"emp": "87",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d88",
"name": "Joseph Gafa",
"emp": "88",
"plant": "Prestons",
"workgroup": "LOD relief"
},
{
"id": "d89",
"name": "Joshua Domanski",
"emp": "89",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d90",
"name": "Juan (Carlos) Alfaro Ponce",
"emp": "90",
"plant": "Girraween",
"workgroup": "Metro"
},
{
"id": "d91",
"name": "Justin Hemmett",
"emp": "91",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d92",
"name": "Justin Waters",
"emp": "92",
"plant": "Brookvale",
"workgroup": "Metro"
},
{
"id": "d93",
"name": "Kamaljeet Sandhu",
"emp": "93",
"plant": "Wetherill park",
"workgroup": "Project"
},
{
"id": "d94",
"name": "Kayla Farr",
"emp": "94",
"plant": "Banksmeadow",
"workgroup": "Metro"
},
{
"id": "d95",
"name": "Kevin Chetcuti",
"emp": "95",
"plant": "Campbelltown",
"workgroup": "LOD"
},
{
"id": "d96",
"name": "Kevin Lockwood",
"emp": "96",
"plant": "Campbelltown",
"workgroup": "LOD"
},
{
"id": "d97",
"name": "Kevin Nguyen",
"emp": "97",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d98",
"name": "Kiwanuka Nyanzi",
"emp": "98",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d99",
"name": "Kuljinder Singh",
"emp": "99",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d100",
"name": "Lakbir Singh",
"emp": "100",
"plant": "Camellia",
"workgroup": "LOD relief"
},
{
"id": "d101",
"name": "Larki Missiris",
"emp": "101",
"plant": "Caringbah",
"workgroup": "Casual"
},
{
"id": "d102",
"name": "Leslie (Feixiang) Li",
"emp": "102",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d103",
"name": "Lorenzo Granata",
"emp": "103",
"plant": "Riverstone",
"workgroup": "LOD relief"
},
{
"id": "d104",
"name": "Louie (Lupco) Briskoski",
"emp": "104",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d105",
"name": "Manpreet Cheema",
"emp": "105",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d106",
"name": "Marie Fabiano",
"emp": "106",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d107",
"name": "Mark Harris",
"emp": "107",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d108",
"name": "Mark Hudson",
"emp": "108",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d109",
"name": "Martin Pollock",
"emp": "109",
"plant": "Riverstone",
"workgroup": "Metro"
},
{
"id": "d110",
"name": "Masoud Borvayhe",
"emp": "110",
"plant": "Banksmeadow",
"workgroup": "LOD relief"
},
{
"id": "d111",
"name": "Mate Glavocevic",
"emp": "111",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d112",
"name": "Matthew Buonasera",
"emp": "112",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d113",
"name": "Matthew Fulton",
"emp": "113",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d114",
"name": "Matthew Groves",
"emp": "114",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d115",
"name": "Matthew Mills",
"emp": "115",
"plant": "Girraween",
"workgroup": "Metro"
},
{
"id": "d116",
"name": "Matthew Pirreca",
"emp": "116",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d117",
"name": "Michael Bennett",
"emp": "117",
"plant": "Camellia",
"workgroup": "Metro"
},
{
"id": "d118",
"name": "Michael Howcroft",
"emp": "118",
"plant": "Brookvale",
"workgroup": "Metro"
},
{
"id": "d119",
"name": "Michael Ibrahem",
"emp": "119",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d120",
"name": "Michael Kokal",
"emp": "120",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d121",
"name": "Michael Scott",
"emp": "121",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d122",
"name": "Michael Vasiliou",
"emp": "122",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d123",
"name": "Mikhail Hanna",
"emp": "123",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d124",
"name": "Mohan Singh Pannu",
"emp": "124",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d125",
"name": "Mosa Kurdi",
"emp": "125",
"plant": "Prestons",
"workgroup": "Project"
},
{
"id": "d126",
"name": "Muhammad Ahsan",
"emp": "126",
"plant": "Wetherill Park",
"workgroup": "Project"
},
{
"id": "d127",
"name": "Muhammad Malik",
"emp": "127",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d128",
"name": "Mustafa Caybas",
"emp": "128",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d129",
"name": "Najeeb Georges",
"emp": "129",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d130",
"name": "Najmuddin Ahmadi",
"emp": "130",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d131",
"name": "Nathan Bettiens",
"emp": "131",
"plant": "Greenacre",
"workgroup": "Project Day"
},
{
"id": "d132",
"name": "Navdeep Singh",
"emp": "132",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d133",
"name": "Navjot Kamboj",
"emp": "133",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d134",
"name": "Nicholas Cakovski",
"emp": "134",
"plant": "Banksmeadow",
"workgroup": "LOD relief"
},
{
"id": "d135",
"name": "Nikola Gorgioski",
"emp": "135",
"plant": "Pyrmont",
"workgroup": "LOD"
},
{
"id": "d136",
"name": "Noel Clarke",
"emp": "136",
"plant": "Brookvale",
"workgroup": "Metro"
},
{
"id": "d137",
"name": "Omar Hasan",
"emp": "137",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d138",
"name": "Osaigbovo Ugiagbe",
"emp": "138",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d139",
"name": "Pablo Pucciarelli",
"emp": "139",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d140",
"name": "Pak Kin Leung",
"emp": "140",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d141",
"name": "Panagiotis Panagiotopoulos",
"emp": "141",
"plant": "Greenacre",
"workgroup": "LOD relief"
},
{
"id": "d142",
"name": "Pankaj Kumar",
"emp": "142",
"plant": "Greenacre",
"workgroup": "LOD relief"
},
{
"id": "d143",
"name": "Parminder Singh",
"emp": "143",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d144",
"name": "Paul Cove",
"emp": "144",
"plant": "Riverstone",
"workgroup": "LOD relief"
},
{
"id": "d145",
"name": "Paul Jennings",
"emp": "145",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d146",
"name": "Pece (Peter) Jankovski",
"emp": "146",
"plant": "Artarmon",
"workgroup": "Leading Hand"
},
{
"id": "d147",
"name": "Peter Papoutisis",
"emp": "147",
"plant": "Thornleigh",
"workgroup": "LOD"
},
{
"id": "d148",
"name": "Phillip Steer",
"emp": "148",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d149",
"name": "Prabhdeep Singh",
"emp": "149",
"plant": "Thornleigh",
"workgroup": "LOD"
},
{
"id": "d150",
"name": "Quan Lam",
"emp": "150",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d151",
"name": "Quoc Thai Tran",
"emp": "151",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d152",
"name": "Rade (Rod) Bozinovski",
"emp": "152",
"plant": "Caringbah",
"workgroup": "LOD"
},
{
"id": "d153",
"name": "Rajbir Saini",
"emp": "153",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d154",
"name": "Ranjan Sharma",
"emp": "154",
"plant": "Prestons",
"workgroup": "Project"
},
{
"id": "d155",
"name": "Ravinder Singh",
"emp": "155",
"plant": "Camellia",
"workgroup": "LOD"
},
{
"id": "d156",
"name": "Ravneel Sanehi",
"emp": "156",
"plant": "Wetherill Park",
"workgroup": "LOD"
},
{
"id": "d157",
"name": "Reda Ghobrial",
"emp": "157",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d158",
"name": "Robert Brooker",
"emp": "158",
"plant": "Prestons",
"workgroup": "LOD Relief"
},
{
"id": "d159",
"name": "Salvatore (Sam) Leonardi",
"emp": "159",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d160",
"name": "Samir Shaikh",
"emp": "160",
"plant": "Riverstone",
"workgroup": "LOD"
},
{
"id": "d161",
"name": "Sang Ngoc Tran",
"emp": "161",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d162",
"name": "Sanjeev Manoharan",
"emp": "162",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d163",
"name": "Saso Gruevski",
"emp": "163",
"plant": "Banksmeadow",
"workgroup": "LOD"
},
{
"id": "d164",
"name": "Serge Bianchi",
"emp": "164",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d165",
"name": "Serif Mert",
"emp": "165",
"plant": "Banksmeadow",
"workgroup": "LOD Relief"
},
{
"id": "d166",
"name": "Serkan Gunduz",
"emp": "166",
"plant": "Greenacre",
"workgroup": "Leading Hand"
},
{
"id": "d167",
"name": "Seyed Mousavi",
"emp": "167",
"plant": "Brookvale",
"workgroup": "LOD"
},
{
"id": "d168",
"name": "Shane Martin",
"emp": "168",
"plant": "Greenacre",
"workgroup": "Project Day"
},
{
"id": "d169",
"name": "Shaun Watson",
"emp": "169",
"plant": "Girraween",
"workgroup": "Metro"
},
{
"id": "d170",
"name": "Sherwyn Dominguez",
"emp": "170",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d171",
"name": "Slobodan Tisma",
"emp": "171",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d172",
"name": "Spase Najdoski",
"emp": "172",
"plant": "Caringbah",
"workgroup": "LOD"
},
{
"id": "d173",
"name": "Stanli Leilua",
"emp": "173",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d174",
"name": "Stephen Harris",
"emp": "174",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d175",
"name": "Stephen Mutumba",
"emp": "175",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d176",
"name": "Sukhjit Nigha",
"emp": "176",
"plant": "Riverstone",
"workgroup": "LOD"
},
{
"id": "d177",
"name": "Tarick Jaber",
"emp": "177",
"plant": "Prestons",
"workgroup": "Metro"
},
{
"id": "d178",
"name": "Taufa Mafi",
"emp": "178",
"plant": "Pyrmont",
"workgroup": "Project"
},
{
"id": "d179",
"name": "Thanh Bao Quang",
"emp": "179",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d180",
"name": "To Nhut( TOM )",
"emp": "180",
"plant": "Greenacre",
"workgroup": "LOD"
},
{
"id": "d181",
"name": "Tony Gorkis",
"emp": "181",
"plant": "Riverstone",
"workgroup": "LOD"
},
{
"id": "d182",
"name": "Tony Nackovski",
"emp": "182",
"plant": "Prestons",
"workgroup": "Leading Hand"
},
{
"id": "d183",
"name": "Van Hai Tran",
"emp": "183",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d184",
"name": "Van Quynh Le",
"emp": "184",
"plant": "Prestons",
"workgroup": "LOD"
},
{
"id": "d185",
"name": "Varinder Singh",
"emp": "185",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d186",
"name": "Vincenzo Loreto",
"emp": "186",
"plant": "Greenacre",
"workgroup": "Project Night"
},
{
"id": "d187",
"name": "Vincenzo Mammone",
"emp": "187",
"plant": "Riverstone",
"workgroup": "LOD"
},
{
"id": "d188",
"name": "Walid Aljayashi",
"emp": "188",
"plant": "Greenacre",
"workgroup": "LOD Relief"
},
{
"id": "d189",
"name": "William Cakovski",
"emp": "189",
"plant": "Banksmeadow",
"workgroup": "LOD"
},
{
"id": "d190",
"name": "William Chalmers",
"emp": "190",
"plant": "Wetherill Park",
"workgroup": "Metro"
},
{
"id": "d191",
"name": "William Pettigrew",
"emp": "191",
"plant": "Artarmon",
"workgroup": "LOD"
},
{
"id": "d192",
"name": "Xich Bao An Nguyen",
"emp": "192",
"plant": "Greenacre",
"workgroup": "Project"
},
{
"id": "d193",
"name": "Zeki Mersinli",
"emp": "193",
"plant": "Caringbah",
"workgroup": "LOD"
},
{
"id": "d194",
"name": "Zoran Dzokoski",
"emp": "194",
"plant": "Prestons",
"workgroup": "Metro"
}
];

export const TRUCKS: Truck[] = [
{
"id": "PCC2044",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": null
},
{
"id": "PCC2063",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d162"
},
{
"id": "PCC2088",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d98"
},
{
"id": "PCC2093",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d192"
},
{
"id": "PCC2096",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d127"
},
{
"id": "PCC2812",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d112"
},
{
"id": "PCC2832",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d102"
},
{
"id": "PCC2834",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d168"
},
{
"id": "PCC2836",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": null
},
{
"id": "PCC2840",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d65"
},
{
"id": "PCC2854",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d63"
},
{
"id": "PCC2856",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d175"
},
{
"id": "PCC2867",
"plant": "Greenacre Project",
"region": "Projects",
"defaultDriverId": "d130"
},
{
"id": "PCC2039",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": null
},
{
"id": "PCC2046",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d145"
},
{
"id": "PCC2048",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d111"
},
{
"id": "PCC2049",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d74"
},
{
"id": "PCC2062",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": null
},
{
"id": "PCC2066",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d43"
},
{
"id": "PCC2094",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d170"
},
{
"id": "PCC2098",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d1"
},
{
"id": "PCC2576",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d139"
},
{
"id": "PCC2701",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d108"
},
{
"id": "PCC2725",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d107"
},
{
"id": "PCC2831",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d59"
},
{
"id": "PCC2843",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": null
},
{
"id": "PCC2850",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d178"
},
{
"id": "PCC2864",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": null
},
{
"id": "PCC2884",
"plant": "Pyrmont Project",
"region": "Projects",
"defaultDriverId": "d174"
},
{
"id": "PCC2040",
"plant": "Banksmeadow Project",
"region": "Projects",
"defaultDriverId": "d15"
},
{
"id": "PCC2038",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d38"
},
{
"id": "PCC2087",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d23"
},
{
"id": "PCC2092",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d42"
},
{
"id": "PCC2145",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d52"
},
{
"id": "PCC2527",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d125"
},
{
"id": "PCC2808",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d93"
},
{
"id": "PCC2825",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d154"
},
{
"id": "PCC2829",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": null
},
{
"id": "PCC2851",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d67"
},
{
"id": "PCC2885",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d126"
},
{
"id": "PCX2174",
"plant": "Wetherill Project",
"region": "Projects",
"defaultDriverId": "d5"
},
{
"id": "PLC2021",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d104"
},
{
"id": "PLC2185",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": null
},
{
"id": "PLC2191",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d124"
},
{
"id": "PLC2601",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d143"
},
{
"id": "PLC2620",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d51"
},
{
"id": "PLC2627",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d46"
},
{
"id": "PLC2655",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d82"
},
{
"id": "PLC2658",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d2"
},
{
"id": "PLC2697",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d151"
},
{
"id": "PLC2699",
"plant": "Greenacre Metro",
"region": "Projects",
"defaultDriverId": "d120"
},
{
"id": "PLC2192",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d6"
},
{
"id": "PLC2193",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d191"
},
{
"id": "PLC2267",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d99"
},
{
"id": "PLC2613",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d87"
},
{
"id": "PLC2616",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d22"
},
{
"id": "PLC2625",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d24"
},
{
"id": "PLC2628",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d75"
},
{
"id": "PLC2632",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d83"
},
{
"id": "PLC2650",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d179"
},
{
"id": "PLC2685",
"plant": "Artarmon Metro",
"region": "Metro East",
"defaultDriverId": "d36"
},
{
"id": "PCX2032",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d94"
},
{
"id": "PCX2037",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d86"
},
{
"id": "PCX2065",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d165"
},
{
"id": "PCX2180",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d39"
},
{
"id": "PLC2607",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d17"
},
{
"id": "PLC2610",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d33"
},
{
"id": "PLC2630",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d163"
},
{
"id": "PLC2660",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d189"
},
{
"id": "PLC2665",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d50"
},
{
"id": "PLC2739",
"plant": "Banksmeadow Metro",
"region": "Metro East",
"defaultDriverId": "d26"
},
{
"id": "PCX2178",
"plant": "Brookvale Metro",
"region": "Metro East",
"defaultDriverId": "d118"
},
{
"id": "PCX2182",
"plant": "Brookvale Metro",
"region": "Metro East",
"defaultDriverId": "d56"
},
{
"id": "PCX2198",
"plant": "Brookvale Metro",
"region": "Metro East",
"defaultDriverId": "d11"
},
{
"id": "PCX2202",
"plant": "Brookvale Metro",
"region": "Metro East",
"defaultDriverId": "d136"
},
{
"id": "PLC2213",
"plant": "Brookvale Metro",
"region": "Metro East",
"defaultDriverId": "d167"
},
{
"id": "PCC2061",
"plant": "Caringbah METRO",
"region": "Metro East",
"defaultDriverId": "d32"
},
{
"id": "PCC2068",
"plant": "Caringbah METRO",
"region": "Metro East",
"defaultDriverId": "d85"
},
{
"id": "PLC2618",
"plant": "Caringbah METRO",
"region": "Metro East",
"defaultDriverId": "d193"
},
{
"id": "PLC2624",
"plant": "Caringbah METRO",
"region": "Metro East",
"defaultDriverId": "d172"
},
{
"id": "PLC2626",
"plant": "Caringbah METRO",
"region": "Metro East",
"defaultDriverId": "d152"
},
{
"id": "PLC2638",
"plant": "Caringbah METRO",
"region": "Metro East",
"defaultDriverId": "d8"
},
{
"id": "PLC2659",
"plant": "Caringbah METRO",
"region": "Metro East",
"defaultDriverId": "d4"
},
{
"id": "PLC2637",
"plant": "Pyrmont Metro",
"region": "Metro East",
"defaultDriverId": "d80"
},
{
"id": "PLC2675",
"plant": "Pyrmont Metro",
"region": "Metro East",
"defaultDriverId": "d73"
},
{
"id": "PLC2692",
"plant": "Pyrmont Metro",
"region": "Metro East",
"defaultDriverId": "d135"
},
{
"id": "PCX2031",
"plant": "Pyrmont Metro",
"region": "Metro East",
"defaultDriverId": "d106"
},
{
"id": "PCX2181",
"plant": "Campbelltown Metro",
"region": "Metro West",
"defaultDriverId": "d20"
},
{
"id": "PLC2668",
"plant": "Campbelltown Metro",
"region": "Metro West",
"defaultDriverId": "d95"
},
{
"id": "PLC2669",
"plant": "Campbelltown Metro",
"region": "Metro West",
"defaultDriverId": "d96"
},
{
"id": "PLC2676",
"plant": "Campbelltown Metro",
"region": "Metro West",
"defaultDriverId": "d41"
},
{
"id": "PLC2677",
"plant": "Campbelltown Metro",
"region": "Metro West",
"defaultDriverId": "d12"
},
{
"id": "PCX2027",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d194"
},
{
"id": "PCX2030",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d159"
},
{
"id": "PCX2033",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d62"
},
{
"id": "PCX2042",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d14"
},
{
"id": "PCX2043",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d140"
},
{
"id": "PCX2053",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d70"
},
{
"id": "PCX2075",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d177"
},
{
"id": "PCX2077",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d27"
},
{
"id": "PCX2187",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d3"
},
{
"id": "PCX2188",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": null
},
{
"id": "PCX2194",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d81"
},
{
"id": "PCX2195",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d78"
},
{
"id": "PCX2500",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d72"
},
{
"id": "PLC2184",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d183"
},
{
"id": "PLC2189",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d29"
},
{
"id": "PLC2611",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d148"
},
{
"id": "PLC2621",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d157"
},
{
"id": "PLC2642",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d137"
},
{
"id": "PLC2649",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d119"
},
{
"id": "PLC2651",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d129"
},
{
"id": "PLC2652",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d30"
},
{
"id": "PLC2653",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d116"
},
{
"id": "PLC2662",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d150"
},
{
"id": "PLC2666",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d54"
},
{
"id": "PLC2671",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d164"
},
{
"id": "PLC2679",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d7"
},
{
"id": "PLC2693",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d138"
},
{
"id": "PLC2698",
"plant": "Prestons Metro",
"region": "Metro West",
"defaultDriverId": "d184"
},
{
"id": "PCX2020",
"plant": "Wetherill Metro",
"region": "Metro West",
"defaultDriverId": "d190"
},
{
"id": "PLC2688",
"plant": "Wetherill Metro",
"region": "Metro West",
"defaultDriverId": "d156"
},
{
"id": "PCX2060",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d117"
},
{
"id": "PLC2274",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d123"
},
{
"id": "PLC2608",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d97"
},
{
"id": "PLC2619",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d71"
},
{
"id": "PLC2636",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d9"
},
{
"id": "PLC2639",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d121"
},
{
"id": "PLC2647",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d155"
},
{
"id": "PLC2672",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d153"
},
{
"id": "PLC2717",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d35"
},
{
"id": "PLC2684",
"plant": "Camellia Metro",
"region": "Metro Central",
"defaultDriverId": "d18"
},
{
"id": "PCX2024",
"plant": "Girraween Metro",
"region": "Metro Central",
"defaultDriverId": "d90"
},
{
"id": "PCX2026",
"plant": "Girraween Metro",
"region": "Metro Central",
"defaultDriverId": "d115"
},
{
"id": "PCX2028",
"plant": "Girraween Metro",
"region": "Metro Central",
"defaultDriverId": "d109"
},
{
"id": "PCX2076",
"plant": "Girraween Metro",
"region": "Metro Central",
"defaultDriverId": "d169"
},
{
"id": "PCX2080",
"plant": "Girraween Metro",
"region": "Metro Central",
"defaultDriverId": "d16"
},
{
"id": "PCX2176",
"plant": "Girraween Metro",
"region": "Metro Central",
"defaultDriverId": "d55"
},
{
"id": "PLC2603",
"plant": "Riverstone Metro",
"region": "Metro Central",
"defaultDriverId": "d181"
},
{
"id": "PLC2609",
"plant": "Riverstone Metro",
"region": "Metro Central",
"defaultDriverId": "d176"
},
{
"id": "PLC2654",
"plant": "Riverstone Metro",
"region": "Metro Central",
"defaultDriverId": "d160"
},
{
"id": "PLC2682",
"plant": "Riverstone Metro",
"region": "Metro Central",
"defaultDriverId": "d187"
},
{
"id": "PLC2687",
"plant": "Riverstone Metro",
"region": "Metro Central",
"defaultDriverId": "d45"
},
{
"id": "PCX2078",
"plant": "Thornleigh Metro",
"region": "Metro Central",
"defaultDriverId": "d48"
},
{
"id": "PLC2183",
"plant": "Thornleigh Metro",
"region": "Metro Central",
"defaultDriverId": "d28"
},
{
"id": "PLC2646",
"plant": "Thornleigh Metro",
"region": "Metro Central",
"defaultDriverId": "d44"
},
{
"id": "PLC2656",
"plant": "Thornleigh Metro",
"region": "Metro Central",
"defaultDriverId": "d149"
},
{
"id": "PLC2667",
"plant": "Thornleigh Metro",
"region": "Metro Central",
"defaultDriverId": "d147"
}
];

export const LEAVE: Array<Omit<Leave, "id">> = [
{
"driverId": "d113",
"type": "Personal Leave",
"start": "2026-06-02",
"end": "2026-06-02"
},
{
"driverId": "d79",
"type": "Personal Leave",
"start": "2026-06-02",
"end": "2026-06-02"
},
{
"driverId": "d68",
"type": "Personal Leave",
"start": "2026-06-02",
"end": "2026-06-02"
},
{
"driverId": "d83",
"type": "Annual Leave",
"start": "2026-06-12",
"end": "2026-06-18"
},
{
"driverId": "d39",
"type": "Annual Leave",
"start": "2026-06-02",
"end": "2026-06-08"
},
{
"driverId": "d102",
"type": "Annual Leave",
"start": "2026-06-07",
"end": "2026-06-09"
},
{
"driverId": "d167",
"type": "Annual Leave",
"start": "2026-06-03",
"end": "2026-06-08"
},
{
"driverId": "d13",
"type": "Annual Leave",
"start": "2026-06-14",
"end": "2026-06-16"
},
{
"driverId": "d19",
"type": "Annual Leave",
"start": "2026-06-08",
"end": "2026-06-10"
},
{
"driverId": "d138",
"type": "Annual Leave",
"start": "2026-06-18",
"end": "2026-06-23"
},
{
"driverId": "d25",
"type": "Annual Leave",
"start": "2026-06-02",
"end": "2026-06-08"
}
];

export const SEED_DAY: DayBoard = {
"date": "2026-06-02",
"assignments": [
{
"truck": "PCC2044",
"status": "OFF-BD",
"time": "",
"driverId": null
},
{
"truck": "PCC2063",
"status": "ON",
"time": "",
"driverId": "d162"
},
{
"truck": "PCC2088",
"status": "ON",
"time": "",
"driverId": "d98"
},
{
"truck": "PCC2093",
"status": "ON",
"time": "",
"driverId": "d192"
},
{
"truck": "PCC2096",
"status": "ON",
"time": "",
"driverId": "d127"
},
{
"truck": "PCC2812",
"status": "ON",
"time": "",
"driverId": "d112"
},
{
"truck": "PCC2832",
"status": "ON",
"time": "",
"driverId": "d102"
},
{
"truck": "PCC2834",
"status": "ON",
"time": "",
"driverId": "d168"
},
{
"truck": "PCC2836",
"status": "OFF",
"time": "",
"driverId": null
},
{
"truck": "PCC2840",
"status": "ON",
"time": "",
"driverId": "d65"
},
{
"truck": "PCC2854",
"status": "ON",
"time": "",
"driverId": "d63"
},
{
"truck": "PCC2856",
"status": "ON-LS",
"time": "10am",
"driverId": "d175"
},
{
"truck": "PCC2867",
"status": "ON",
"time": "",
"driverId": "d130"
},
{
"truck": "PCC2039",
"status": "OFF",
"time": "",
"driverId": null
},
{
"truck": "PCC2046",
"status": "ON",
"time": "",
"driverId": "d145"
},
{
"truck": "PCC2048",
"status": "ON",
"time": "",
"driverId": "d111"
},
{
"truck": "PCC2049",
"status": "ON-SER",
"time": "1pm",
"driverId": "d74"
},
{
"truck": "PCC2062",
"status": "OFF-BD",
"time": "",
"driverId": null
},
{
"truck": "PCC2066",
"status": "ON",
"time": "",
"driverId": "d43"
},
{
"truck": "PCC2094",
"status": "ON-LS",
"time": "9am",
"driverId": "d170"
},
{
"truck": "PCC2098",
"status": "ON",
"time": "",
"driverId": "d1"
},
{
"truck": "PCC2576",
"status": "ON",
"time": "",
"driverId": "d139"
},
{
"truck": "PCC2701",
"status": "ON",
"time": "",
"driverId": "d108"
},
{
"truck": "PCC2725",
"status": "ON",
"time": "",
"driverId": "d107"
},
{
"truck": "PCC2831",
"status": "ON",
"time": "",
"driverId": "d59"
},
{
"truck": "PCC2843",
"status": "OFF-BD",
"time": "",
"driverId": null
},
{
"truck": "PCC2850",
"status": "ON",
"time": "",
"driverId": "d178"
},
{
"truck": "PCC2864",
"status": "OFF-BD",
"time": "",
"driverId": null
},
{
"truck": "PCC2884",
"status": "ON",
"time": "",
"driverId": "d174"
},
{
"truck": "PCC2040",
"status": "ON",
"time": "",
"driverId": "d15"
},
{
"truck": "PCC2038",
"status": "ON",
"time": "",
"driverId": "d38"
},
{
"truck": "PCC2087",
"status": "ON",
"time": "",
"driverId": "d23"
},
{
"truck": "PCC2092",
"status": "ON",
"time": "",
"driverId": "d42"
},
{
"truck": "PCC2145",
"status": "ON",
"time": "",
"driverId": "d52"
},
{
"truck": "PCC2527",
"status": "ON",
"time": "",
"driverId": "d125"
},
{
"truck": "PCC2808",
"status": "ON",
"time": "",
"driverId": "d93"
},
{
"truck": "PCC2825",
"status": "ON",
"time": "",
"driverId": "d154"
},
{
"truck": "PCC2829",
"status": "OFF-BD",
"time": "",
"driverId": null
},
{
"truck": "PCC2851",
"status": "ON",
"time": "",
"driverId": "d67"
},
{
"truck": "PCC2885",
"status": "ON",
"time": "",
"driverId": "d126"
},
{
"truck": "PCX2174",
"status": "ON",
"time": "",
"driverId": "d5"
},
{
"truck": "PLC2021",
"status": "ON-FTO",
"time": "",
"driverId": "d104"
},
{
"truck": "PLC2185",
"status": "ON",
"time": "",
"driverId": null
},
{
"truck": "PLC2191",
"status": "OFF",
"time": "",
"driverId": "d124"
},
{
"truck": "PLC2601",
"status": "ON",
"time": "",
"driverId": "d143"
},
{
"truck": "PLC2620",
"status": "ON",
"time": "",
"driverId": "d51"
},
{
"truck": "PLC2627",
"status": "ON",
"time": "",
"driverId": "d46"
},
{
"truck": "PLC2655",
"status": "ON",
"time": "",
"driverId": "d82"
},
{
"truck": "PLC2658",
"status": "ON",
"time": "",
"driverId": "d2"
},
{
"truck": "PLC2697",
"status": "OFF",
"time": "",
"driverId": "d151"
},
{
"truck": "PLC2699",
"status": "ON",
"time": "",
"driverId": "d120"
},
{
"truck": "PLC2192",
"status": "ON",
"time": "",
"driverId": "d6"
},
{
"truck": "PLC2193",
"status": "ON",
"time": "",
"driverId": "d191"
},
{
"truck": "PLC2267",
"status": "ON-LS",
"time": "8AM",
"driverId": "d99"
},
{
"truck": "PLC2613",
"status": "ON",
"time": "",
"driverId": "d87"
},
{
"truck": "PLC2616",
"status": "ON-FTO",
"time": "",
"driverId": "d22"
},
{
"truck": "PLC2625",
"status": "ON",
"time": "",
"driverId": "d24"
},
{
"truck": "PLC2628",
"status": "ON",
"time": "",
"driverId": "d75"
},
{
"truck": "PLC2632",
"status": "ON",
"time": "",
"driverId": "d83"
},
{
"truck": "PLC2650",
"status": "ON",
"time": "",
"driverId": "d179"
},
{
"truck": "PLC2685",
"status": "ON",
"time": "",
"driverId": "d36"
},
{
"truck": "PCX2032",
"status": "ON-FTO",
"time": "",
"driverId": "d94"
},
{
"truck": "PCX2037",
"status": "ON",
"time": "",
"driverId": "d86"
},
{
"truck": "PCX2065",
"status": "ON",
"time": "",
"driverId": "d165"
},
{
"truck": "PCX2180",
"status": "ON",
"time": "",
"driverId": "d39"
},
{
"truck": "PLC2607",
"status": "ON",
"time": "",
"driverId": "d17"
},
{
"truck": "PLC2610",
"status": "ON",
"time": "",
"driverId": "d33"
},
{
"truck": "PLC2630",
"status": "ON",
"time": "",
"driverId": "d163"
},
{
"truck": "PLC2660",
"status": "ON",
"time": "",
"driverId": "d189"
},
{
"truck": "PLC2665",
"status": "ON",
"time": "",
"driverId": "d50"
},
{
"truck": "PLC2739",
"status": "ON",
"time": "",
"driverId": "d26"
},
{
"truck": "PCX2178",
"status": "ON-SER",
"time": "midday",
"driverId": "d118"
},
{
"truck": "PCX2182",
"status": "ON-DED",
"time": "RELIEF",
"driverId": "d56"
},
{
"truck": "PCX2198",
"status": "ON-FTO",
"time": "",
"driverId": "d11"
},
{
"truck": "PCX2202",
"status": "ON",
"time": "",
"driverId": "d136"
},
{
"truck": "PLC2213",
"status": "ON",
"time": "",
"driverId": "d167"
},
{
"truck": "PCC2061",
"status": "ON",
"time": "",
"driverId": "d32"
},
{
"truck": "PCC2068",
"status": "ON-FTO",
"time": "",
"driverId": "d85"
},
{
"truck": "PLC2618",
"status": "ON",
"time": "",
"driverId": "d193"
},
{
"truck": "PLC2624",
"status": "ON",
"time": "",
"driverId": "d172"
},
{
"truck": "PLC2626",
"status": "ON",
"time": "",
"driverId": "d152"
},
{
"truck": "PLC2638",
"status": "ON",
"time": "",
"driverId": "d8"
},
{
"truck": "PLC2659",
"status": "ON",
"time": "",
"driverId": "d4"
},
{
"truck": "PLC2637",
"status": "ON",
"time": "",
"driverId": "d80"
},
{
"truck": "PLC2675",
"status": "ON",
"time": "",
"driverId": "d73"
},
{
"truck": "PLC2692",
"status": "ON-FTO",
"time": "",
"driverId": "d135"
},
{
"truck": "PCX2031",
"status": "ON",
"time": "",
"driverId": "d106"
},
{
"truck": "PCX2181",
"status": "ON",
"time": "",
"driverId": "d20"
},
{
"truck": "PLC2668",
"status": "ON",
"time": "",
"driverId": "d95"
},
{
"truck": "PLC2669",
"status": "ON-FTO",
"time": "",
"driverId": "d96"
},
{
"truck": "PLC2676",
"status": "ON",
"time": "",
"driverId": "d41"
},
{
"truck": "PLC2677",
"status": "ON",
"time": "",
"driverId": "d12"
},
{
"truck": "PCX2027",
"status": "ON",
"time": "",
"driverId": "d194"
},
{
"truck": "PCX2030",
"status": "ON-LS",
"time": "9am",
"driverId": "d159"
},
{
"truck": "PCX2033",
"status": "ON",
"time": "",
"driverId": "d62"
},
{
"truck": "PCX2042",
"status": "ON",
"time": "",
"driverId": "d14"
},
{
"truck": "PCX2043",
"status": "ON",
"time": "",
"driverId": "d140"
},
{
"truck": "PCX2053",
"status": "ON",
"time": "",
"driverId": "d70"
},
{
"truck": "PCX2075",
"status": "ON",
"time": "",
"driverId": "d177"
},
{
"truck": "PCX2077",
"status": "ON",
"time": "",
"driverId": "d27"
},
{
"truck": "PCX2187",
"status": "ON",
"time": "",
"driverId": "d3"
},
{
"truck": "PCX2188",
"status": "OFF",
"time": "",
"driverId": null
},
{
"truck": "PCX2194",
"status": "ON",
"time": "",
"driverId": "d81"
},
{
"truck": "PCX2195",
"status": "ON-LS",
"time": "9am",
"driverId": "d78"
},
{
"truck": "PCX2500",
"status": "ON",
"time": "",
"driverId": "d72"
},
{
"truck": "PLC2184",
"status": "ON",
"time": "",
"driverId": "d183"
},
{
"truck": "PLC2189",
"status": "ON",
"time": "",
"driverId": "d29"
},
{
"truck": "PLC2611",
"status": "ON",
"time": "",
"driverId": "d148"
},
{
"truck": "PLC2621",
"status": "ON",
"time": "",
"driverId": "d157"
},
{
"truck": "PLC2642",
"status": "ON",
"time": "",
"driverId": "d137"
},
{
"truck": "PLC2649",
"status": "ON",
"time": "",
"driverId": "d119"
},
{
"truck": "PLC2651",
"status": "ON",
"time": "",
"driverId": "d129"
},
{
"truck": "PLC2652",
"status": "ON",
"time": "",
"driverId": "d30"
},
{
"truck": "PLC2653",
"status": "ON",
"time": "",
"driverId": "d116"
},
{
"truck": "PLC2662",
"status": "ON",
"time": "",
"driverId": "d150"
},
{
"truck": "PLC2666",
"status": "ON-FTO",
"time": "3pm",
"driverId": "d54"
},
{
"truck": "PLC2671",
"status": "ON",
"time": "",
"driverId": "d164"
},
{
"truck": "PLC2679",
"status": "ON",
"time": "",
"driverId": "d7"
},
{
"truck": "PLC2693",
"status": "ON",
"time": "",
"driverId": "d138"
},
{
"truck": "PLC2698",
"status": "ON",
"time": "",
"driverId": "d184"
},
{
"truck": "PCX2020",
"status": "ON",
"time": "",
"driverId": "d190"
},
{
"truck": "PLC2688",
"status": "ON",
"time": "",
"driverId": "d156"
},
{
"truck": "PCX2060",
"status": "ON",
"time": "",
"driverId": "d117"
},
{
"truck": "PLC2274",
"status": "ON-FTO",
"time": "",
"driverId": "d123"
},
{
"truck": "PLC2608",
"status": "ON",
"time": "",
"driverId": "d97"
},
{
"truck": "PLC2619",
"status": "ON",
"time": "",
"driverId": "d71"
},
{
"truck": "PLC2636",
"status": "ON",
"time": "",
"driverId": "d9"
},
{
"truck": "PLC2639",
"status": "ON",
"time": "",
"driverId": "d121"
},
{
"truck": "PLC2647",
"status": "ON",
"time": "",
"driverId": "d155"
},
{
"truck": "PLC2672",
"status": "ON",
"time": "",
"driverId": "d153"
},
{
"truck": "PLC2717",
"status": "OFF",
"time": "",
"driverId": "d35"
},
{
"truck": "PLC2684",
"status": "ON",
"time": "",
"driverId": "d18"
},
{
"truck": "PCX2024",
"status": "ON",
"time": "",
"driverId": "d90"
},
{
"truck": "PCX2026",
"status": "ON",
"time": "",
"driverId": "d115"
},
{
"truck": "PCX2028",
"status": "ON-FTO",
"time": "",
"driverId": "d109"
},
{
"truck": "PCX2076",
"status": "ON",
"time": "",
"driverId": "d169"
},
{
"truck": "PCX2080",
"status": "ON",
"time": "",
"driverId": "d16"
},
{
"truck": "PCX2176",
"status": "ON",
"time": "preston start",
"driverId": "d55"
},
{
"truck": "PLC2603",
"status": "OFF",
"time": "",
"driverId": "d181"
},
{
"truck": "PLC2609",
"status": "ON",
"time": "",
"driverId": "d176"
},
{
"truck": "PLC2654",
"status": "ON",
"time": "",
"driverId": "d160"
},
{
"truck": "PLC2682",
"status": "ON-DED",
"time": "3pm",
"driverId": "d187"
},
{
"truck": "PLC2687",
"status": "OFF",
"time": "",
"driverId": "d45"
},
{
"truck": "PCX2078",
"status": "ON-FTO",
"time": "",
"driverId": "d48"
},
{
"truck": "PLC2183",
"status": "ON-EF",
"time": "4PM",
"driverId": "d28"
},
{
"truck": "PLC2646",
"status": "ON",
"time": "",
"driverId": "d44"
},
{
"truck": "PLC2656",
"status": "ON",
"time": "",
"driverId": "d149"
},
{
"truck": "PLC2667",
"status": "ON",
"time": "",
"driverId": "d147"
}
]
};
