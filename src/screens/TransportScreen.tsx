import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
    useWindowDimensions,
    Switch,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

// Mock Data Interfaces
interface Trip {
    id: string;
    name: string;
    destination: string;
    date: string; // ISO Date
    end_date?: string; // ISO Date
    is_multi_day: boolean;
    departure_time: string; // HH:mm:ss
    return_time: string; // HH:mm:ss
    attendingCount: number;
    chaperone: string;
    status: 'approved' | 'pending' | 'confirmed';
    type: string; // e.g., 'field_trip', 'sporting_event'
    event_type: string; // e.g., 'field-trip', 'Basketball', 'Soccer'
    transportation_type: string; // e.g., 'Bus', 'Van'
    driver?: string;
    meal?: string;
    event_length?: string;
    capacity?: string;
    location_type?: string;
}

// Mock Data - Expanded for testing filters
const MOCK_TRIPS: Trip[] = [
    {
        id: '1',
        name: 'Seniors Boston Trip',
        destination: 'Boston, MA',
        date: '2026-07-30',
        end_date: '2026-08-01',
        is_multi_day: true,
        departure_time: '08:00:00',
        return_time: '18:00:00',
        attendingCount: 45,
        chaperone: 'Sarah Jenkins',
        status: 'pending',
        type: 'field_trip',
        event_type: 'field-trip',
        transportation_type: 'Bus',
    },
    {
        id: '2',
        name: 'Super Montreal Trip',
        destination: 'Montreal, QC',
        date: '2026-07-30',
        end_date: '2026-08-01',
        is_multi_day: true,
        departure_time: '07:30:00',
        return_time: '20:00:00',
        attendingCount: 32,
        chaperone: 'Mike Thompson',
        status: 'approved',
        type: 'field_trip',
        event_type: 'field-trip',
        transportation_type: 'Bus',
    },
    {
        id: '3',
        name: 'Junior Beach Day',
        destination: 'Sandy Point Beach',
        date: '2026-08-05',
        is_multi_day: false,
        departure_time: '10:00:00',
        return_time: '16:00:00',
        attendingCount: 80,
        chaperone: 'Jessica Alva',
        status: 'confirmed',
        type: 'field_trip',
        event_type: 'field-trip',
        transportation_type: 'Bus',
    },
    {
        id: '4',
        name: 'Varsity Basketball vs. Camp Lohikan',
        destination: 'Camp Lohikan',
        date: '2026-07-28',
        is_multi_day: false,
        departure_time: '13:00:00',
        return_time: '17:00:00',
        attendingCount: 15,
        chaperone: 'Coach Miller',
        status: 'approved',
        type: 'sporting_event',
        event_type: 'Basketball',
        transportation_type: 'Van',
    },
    {
        id: '5',
        name: 'U13 Soccer Tournament',
        destination: 'Regional Fields',
        date: '2026-08-02',
        is_multi_day: false,
        departure_time: '09:00:00',
        return_time: '14:00:00',
        attendingCount: 22,
        chaperone: 'Coach Sarah',
        status: 'pending',
        type: 'sporting_event',
        event_type: 'Soccer',
        transportation_type: 'Bus',
    },
];

const StatusBadge = ({ status }: { status: string }) => {
    let backgroundColor = theme.colors.warning + '20'; // transparent orange
    let color: string = theme.colors.warning;
    let label = 'Pending';

    if (status === 'approved' || status === 'confirmed') {
        backgroundColor = theme.colors.success + '20';
        color = theme.colors.success;
        label = status === 'approved' ? 'Approved' : 'Confirmed';
    } else if (status === 'pending') {
        backgroundColor = theme.colors.danger + '20';
        color = theme.colors.danger;
        label = 'Pending Approval';
    }

    return (
        <View style={[styles.badge, { backgroundColor }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
};

// Mock Data for Roster
interface Camper {
    id: string;
    name: string;
    divisionId: string;
    avatar?: string;
    age?: number;
    grade?: string;
    allergies?: string;
    medical_notes?: string;
    group_name?: string;
    gender?: string;
}

interface Division {
    id: string;
    name: string;
    totalCount: number;
}

const MOCK_DIVISIONS: Division[] = [
    // Girls (Ordered by age/grade as per screenshot)
    { id: 'freshmen_a_girls', name: 'Freshmen A Girls', totalCount: 22 },
    { id: 'freshmen_b_girls', name: 'Freshmen B Girls', totalCount: 25 },
    { id: 'cadet_girls', name: 'Cadet Girls', totalCount: 20 },
    { id: 'sophomore_girls', name: 'Sophomore Girls', totalCount: 15 },
    { id: 'junior_girls', name: 'Junior Girls', totalCount: 16 },
    { id: 'senior_girls', name: 'Senior Girls', totalCount: 17 },
    { id: 'super_girls', name: 'Super Girls', totalCount: 18 },
    { id: 'teen_girls', name: 'Teen Girls', totalCount: 15 },
    { id: 'cit_girls', name: 'CIT Girls', totalCount: 20 },

    // Boys (Assuming similar structure)
    { id: 'freshmen_a_boys', name: 'Freshmen A Boys', totalCount: 20 },
    { id: 'freshmen_b_boys', name: 'Freshmen B Boys', totalCount: 18 },
    { id: 'cadet_boys', name: 'Cadet Boys', totalCount: 35 },
    { id: 'sophomore_boys', name: 'Sophomore Boys', totalCount: 22 },
    { id: 'junior_boys', name: 'Junior Boys', totalCount: 21 },
    { id: 'senior_boys', name: 'Senior Boys', totalCount: 18 },
    { id: 'super_boys', name: 'Super Boys', totalCount: 19 },
    { id: 'teen_boys', name: 'Teen Boys', totalCount: 14 },
    { id: 'cit_boys', name: 'CIT Boys', totalCount: 13 },
];

const MOCK_CAMPERS: Camper[] = [
    // A - Matching Screenshot
    { id: '101', name: 'Abby Weiss', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 1' },
    { id: '201', name: 'Adam Elliott', divisionId: 'freshmen_b_boys', age: 9, grade: '4th', group_name: 'Cabin A' },
    { id: '11001', name: 'Addison Brewer', divisionId: 'sophomore_girls', age: 12, grade: '7th', group_name: 'Lodge 1' },
    { id: '102', name: 'Adrianna Gelb', divisionId: 'cit_girls', age: 16, grade: '11th', allergies: 'Peanuts', group_name: 'Bunk 1' },
    { id: '202', name: 'Aiden Feld', divisionId: 'freshmen_b_boys', age: 9, grade: '4th', group_name: 'Cabin B' },
    { id: '4001', name: 'Aiden Leon', divisionId: 'sophomore_boys', age: 13, grade: '8th', group_name: 'Bunk 5' },
    { id: '203', name: 'Aiden Weisz', divisionId: 'freshmen_b_boys', age: 9, grade: '4th', allergies: 'Gluten', group_name: 'Cabin A' },
    { id: '204', name: 'AJ Goldberg', divisionId: 'freshmen_b_boys', age: 8, grade: '3rd', group_name: 'Cabin B' },
    { id: '5001', name: 'Alaia Khalili', divisionId: 'freshmen_b_girls', age: 9, grade: '4th', group_name: 'Lodge A' },
    { id: '6001', name: 'Alex Haboush', divisionId: 'cit_boys', age: 16, grade: '11th', group_name: 'Bunk 9' },
    { id: '1501', name: 'Alex Scher', divisionId: 'teen_boys', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '7001', name: 'Alex Stumacher', divisionId: 'cadet_boys', age: 7, grade: '2nd', group_name: 'Cabin C' },
    { id: '8001', name: 'Alexa Alfred', divisionId: 'super_girls', age: 14, grade: '9th', group_name: 'Lodge X' },
    { id: '8002', name: 'Alexa Friedland', divisionId: 'super_girls', age: 14, grade: '9th', group_name: 'Lodge Y' },
    { id: '8003', name: 'Alexa Horowitz', divisionId: 'super_girls', age: 14, grade: '9th', group_name: 'Lodge X' },
    { id: '2515121', name: 'Alexa Resnick', divisionId: 'senior_girls', age: 15, grade: '10th', group_name: 'Lodge 8' },
    { id: '2463811', name: 'Alexis Rayman', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 2' },
    { id: '8077303', name: 'Amanda Goldstein', divisionId: 'freshmen_a_girls', age: 8, grade: '3rd', group_name: 'Lodge 3' },
    { id: '2042272', name: 'Amanda Bruck', divisionId: 'freshmen_a_girls', age: 8, grade: '3rd', group_name: 'Lodge 3' },
    { id: '2042893', name: 'Amanda Miller', divisionId: 'freshmen_b_girls', age: 9, grade: '4th', group_name: 'Lodge B' },
    { id: '2685748', name: 'Amanda Stark', divisionId: 'freshmen_b_girls', age: 9, grade: '4th', group_name: 'Lodge B' },
    { id: '2389195', name: 'Aaron Perchekly', divisionId: 'sophomore_boys', age: 13, grade: '8th', group_name: 'Bunk 6' },
    { id: '10101', name: 'Abby Katz', divisionId: 'cadet_girls', age: 7, grade: '2nd', group_name: 'Lodge Z' },
    { id: '1801', name: 'Adam Mayer- Schiaffo', divisionId: 'senior_boys', age: 15, grade: '10th', group_name: 'Bunk 12' },
    { id: '3173977', name: 'Adam Dickstein', divisionId: 'cit_boys', age: 16, grade: '11th', group_name: 'Bunk 8' },
    { id: '3000270', name: 'Aidan Weiss', divisionId: 'junior_boys', age: 10, grade: '5th', group_name: 'Cabin E' },
    { id: '1302', name: 'Asher Feldman', divisionId: 'super_boys', age: 14, grade: '9th', group_name: 'Bunk 10' },
    { id: '1802', name: 'Asher Rhine', divisionId: 'senior_boys', age: 15, grade: '10th', group_name: 'Bunk 12' },
    { id: '8532840', name: 'Austin Dorfman', divisionId: 'cit_boys', age: 16, grade: '11th', group_name: 'Bunk 8' },
    { id: '103', name: 'Avery Rothstein', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 2' },

    // Mixed B-Z
    { id: '5408355', name: 'Ben Schwed', divisionId: 'super_boys', age: 14, grade: '9th', group_name: 'Bunk 10' },
    { id: '5399267', name: 'Ben Kaynes', divisionId: 'super_boys', age: 14, grade: '9th', group_name: 'Bunk 10' },
    { id: '4066885', name: 'Blake Rubach', divisionId: 'junior_boys', age: 10, grade: '5th', group_name: 'Cabin E' },
    { id: '2042911', name: 'Brianna Mittleman', divisionId: 'junior_girls', age: 10, grade: '5th', group_name: 'Lodge 5' },
    { id: '4407994', name: 'Brooke Glazer', divisionId: 'junior_girls', age: 10, grade: '5th', group_name: 'Lodge 5' },
    { id: '2042247', name: 'Carly Borzooyeh', divisionId: 'senior_girls', age: 15, grade: '10th', group_name: 'Lodge 8' },
    { id: '4123826', name: 'Charley Smouha', divisionId: 'freshmen_a_girls', age: 8, grade: '3rd', group_name: 'Lodge 3' },
    { id: '2476105', name: 'Cooper Ellenberg', divisionId: 'freshmen_a_boys', age: 8, grade: '3rd', group_name: 'Cabin D' },
    { id: '2042558', name: 'Cooper Greene', divisionId: 'freshmen_a_boys', age: 8, grade: '3rd', group_name: 'Cabin D' },
    { id: '4731610', name: 'Cooper Kirschner', divisionId: 'freshmen_b_boys', age: 9, grade: '4th', group_name: 'Cabin A' },
    { id: '4091633', name: 'Daniella Silverman', divisionId: 'cadet_girls', age: 7, grade: '2nd', group_name: 'Lodge Z' },
    { id: '4098992', name: 'Danielle Keyes', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 1' },
    { id: '6284414', name: 'David Kirshner', divisionId: 'teen_boys', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '701', name: 'Dean Goldstein', divisionId: 'cadet_boys', age: 7, grade: '2nd', group_name: 'Cabin C' },
    { id: '4112628', name: 'Demi Irgang', divisionId: 'sophomore_girls', age: 12, grade: '7th', group_name: 'Lodge 1' },
    { id: '4044842', name: 'Dylan Fishman', divisionId: 'teen_boys', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '2043240', name: 'Dylan Siegel', divisionId: 'teen_boys', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '3393430', name: 'Dylan Spector', divisionId: 'cadet_boys', age: 7, grade: '2nd', group_name: 'Cabin C' },
    { id: '1701', name: 'Eddie Kirshner', divisionId: 'junior_boys', age: 10, grade: '5th', group_name: 'Cabin E' },
    { id: '2509568', name: 'Elayna Bassuk', divisionId: 'sophomore_girls', age: 12, grade: '7th', group_name: 'Lodge 2' },
    { id: '2312389', name: 'Emma Blatteis', divisionId: 'senior_girls', age: 15, grade: '10th', group_name: 'Lodge 8' },
    { id: '3727103', name: 'Emma Derector', divisionId: 'senior_girls', age: 15, grade: '10th', group_name: 'Lodge 8' },
    { id: '1102', name: 'Emma Plotkin', divisionId: 'junior_girls', age: 10, grade: '5th', group_name: 'Lodge 5' },
    { id: '2273843', name: 'Eric Treihaft', divisionId: 'sophomore_boys', age: 13, grade: '8th', group_name: 'Bunk 5' },
    { id: '8080002', name: 'Ethan Goldman', divisionId: 'sophomore_boys', age: 12, grade: '7th', group_name: 'Bunk 5' },
    { id: '4100669', name: 'Ethan Kaplan', divisionId: 'sophomore_boys', age: 12, grade: '7th', group_name: 'Bunk 6' },
    { id: '8778123', name: 'Farah Blond', divisionId: 'junior_girls', age: 10, grade: '5th', group_name: 'Lodge 5' },
    { id: '105', name: 'Gabriele Cohen', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 2' },
    { id: '2537468', name: 'Gavin Scher', divisionId: 'senior_boys', age: 15, grade: '10th', group_name: 'Bunk 11' },
    { id: '3634057', name: 'Hannah Kluft', divisionId: 'freshmen_b_girls', age: 9, grade: '4th', allergies: 'Dairy', group_name: 'Lodge A' },
    { id: '106', name: 'Hannah Kravic', divisionId: 'cit_girls', age: 16, grade: '11th', allergies: 'Dairy', group_name: 'Bunk 1' },
    { id: '4021233', name: 'Holly Borg', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 2' },
    { id: '107', name: 'Isabella Starr', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 2' },
    { id: '3977117', name: 'Jack Schwartz', divisionId: 'sophomore_boys', age: 13, grade: '8th', group_name: 'Bunk 5' },
    { id: '3995789', name: 'Jack Gidseg', divisionId: 'freshmen_b_boys', age: 9, grade: '4th', group_name: 'Cabin B' },
    { id: '3221517', name: 'Jacob Brooks', divisionId: 'sophomore_boys', age: 13, grade: '8th', group_name: 'Bunk 5' },
    { id: '9677923', name: 'Jake Goldberg', divisionId: 'freshmen_a_boys', age: 8, grade: '3rd', group_name: 'Cabin D' },
    { id: '3584095', name: 'Jake Krauss', divisionId: 'junior_boys', age: 10, grade: '5th', group_name: 'Cabin E' },
    { id: '2043008', name: 'Jake Plotkin', divisionId: 'teen_boys', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '2042363', name: 'Jami Disman', divisionId: 'teen_girls', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '702', name: 'Jared Moreida', divisionId: 'cadet_boys', age: 7, grade: '2nd', allergies: 'Eggs', group_name: 'Cabin C' },
    { id: '3221490', name: 'Jared Shulman', divisionId: 'senior_boys', age: 15, grade: '10th', group_name: 'Bunk 11' },
    { id: '2657755', name: 'Jason Bruck', divisionId: 'sophomore_boys', age: 12, grade: '7th', group_name: 'Lodge 1' },
    { id: '3178632', name: 'Jayden Kass', divisionId: 'freshmen_a_boys', age: 8, grade: '3rd', group_name: 'Cabin D' },
    { id: '2280361', name: 'Jenna Kolberg', divisionId: 'cadet_girls', age: 7, grade: '2nd', group_name: 'Lodge Z' },
    { id: '1702', name: 'Jesse Wayne', divisionId: 'junior_boys', age: 10, grade: '5th', group_name: 'Cabin E' },
    { id: '2383396', name: 'Jessica Kratz', divisionId: 'senior_girls', age: 15, grade: '10th', group_name: 'Lodge 8' },
    { id: '4101823', name: 'Jessica Mitchnick', divisionId: 'teen_girls', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '2453681', name: 'Jonathan Locker', divisionId: 'cit_boys', age: 16, grade: '11th', group_name: 'Bunk 9' },
    { id: '4123697', name: 'Jordan Schenck', divisionId: 'freshmen_a_boys', age: 8, grade: '3rd', group_name: 'Cabin D' },
    { id: '4116129', name: 'Jordan Weiss', divisionId: 'freshmen_b_boys', age: 9, grade: '4th', group_name: 'Cabin B' },
    { id: '3198815', name: 'Julia Haboush', divisionId: 'freshmen_a_girls', age: 8, grade: '3rd', group_name: 'Lodge 3' },
    { id: '501', name: 'Kate Schneider', divisionId: 'freshmen_b_girls', age: 9, grade: '4th', group_name: 'Lodge A' },
    { id: '1101', name: 'Kayla Kusel', divisionId: 'junior_girls', age: 10, grade: '5th', group_name: 'Lodge 5' },
    { id: '3226168', name: 'Kyle Zicherman', divisionId: 'senior_boys', age: 15, grade: '10th', group_name: 'Bunk 12' },
    { id: '2500015', name: 'Laken Pomerantz', divisionId: 'freshmen_b_girls', age: 9, grade: '4th', group_name: 'Lodge B' },
    { id: '2935656', name: 'Landon Krasner', divisionId: 'sophomore_boys', age: 12, grade: '7th', group_name: 'Bunk 6' },
    { id: '2476104', name: 'Leo Ellenberg', divisionId: 'cadet_boys', age: 7, grade: '2nd', group_name: 'Cabin C' },
    { id: '108', name: 'Lily Amsterdam', divisionId: 'cit_girls', age: 15, grade: '10th', group_name: 'Bunk 1' },
    { id: '4098989', name: 'Lindsey Keyes', divisionId: 'teen_girls', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '1601', name: 'Lindsey Pinsky', divisionId: 'teen_girls', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '3965727', name: 'Luke Silverman', divisionId: 'cadet_boys', age: 7, grade: '2nd', group_name: 'Cabin C' },
    { id: '6813708', name: 'Lyla Grosso', divisionId: 'freshmen_a_girls', age: 8, grade: '3rd', group_name: 'Lodge 3' },
    { id: '2043416', name: 'Mack Zelnick', divisionId: 'senior_girls', age: 15, grade: '10th', group_name: 'Lodge 8' },
    { id: '3491825', name: 'Mackenzie Zaffino', divisionId: 'sophomore_girls', age: 12, grade: '7th', allergies: 'Bees', group_name: 'Lodge 2' },
    { id: '4630418', name: 'Max Feinstein', divisionId: 'freshmen_b_boys', age: 9, grade: '4th', group_name: 'Cabin B' },
    { id: '4061578', name: 'Maya Bassan', divisionId: 'cadet_girls', age: 7, grade: '2nd', group_name: 'Lodge Z' },
    { id: '3608259', name: 'Mia Camerata', divisionId: 'freshmen_b_girls', age: 9, grade: '4th', group_name: 'Lodge B' },
    { id: '2042788', name: 'Mia Silverman', divisionId: 'freshmen_b_girls', age: 9, grade: '4th', group_name: 'Lodge B' },
    { id: '133', name: 'Morgen Wilcox', divisionId: 'freshmen_a_girls', age: 8, grade: '3rd', group_name: 'Lodge 3' },
    { id: '2042346', name: 'Nikki Davis', divisionId: 'super_girls', age: 14, grade: '9th', group_name: 'Lodge X' },
    { id: '801', name: 'Nikki Stark', divisionId: 'super_girls', age: 14, grade: '9th', group_name: 'Lodge X' },
    { id: '4097676', name: 'Noah Friedland', divisionId: 'sophomore_boys', age: 12, grade: '7th', group_name: 'Bunk 6' },
    { id: '2042671', name: 'Olivia Kaplan', divisionId: 'junior_girls', age: 10, grade: '5th', group_name: 'Lodge 5' },
    { id: '2533208', name: 'Oscar Meltzer', divisionId: 'cadet_boys', age: 7, grade: '2nd', group_name: 'Cabin C' },
    { id: '311', name: 'Peyton Fishman', divisionId: 'cadet_girls', age: 7, grade: '2nd', group_name: 'Lodge Z' },
    { id: '2042844', name: 'Rebecca Levy', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 1' },
    { id: '1301', name: 'Reece Geller', divisionId: 'super_boys', age: 14, grade: '9th', group_name: 'Bunk 10' },
    { id: '7792482', name: 'Remi Silverman', divisionId: 'freshmen_a_girls', age: 8, grade: '3rd', group_name: 'Lodge 3' },
    { id: '3553752', name: 'Ryan Tepper', divisionId: 'cadet_boys', age: 7, grade: '2nd', group_name: 'Cabin C' },
    { id: '2535083', name: 'Sam Platin', divisionId: 'teen_boys', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '128', name: 'Samantha Leicht', divisionId: 'super_girls', age: 14, grade: '9th', group_name: 'Lodge Y' },
    { id: '2469813', name: 'Samantha Mercer', divisionId: 'cit_girls', age: 16, grade: '11th', group_name: 'Bunk 2' },
    { id: '1402', name: 'Sami Ross', divisionId: 'senior_girls', age: 15, grade: '10th', group_name: 'Lodge 8' },
    { id: '1501', name: 'Alex Scher', divisionId: 'teen_boys', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '1502', name: 'David Kirshner', divisionId: 'teen_boys', age: 15, grade: '10th', group_name: 'Teen House' },

    // Teen Girls
    { id: '1601', name: 'Lindsey Pinsky', divisionId: 'teen_girls', age: 15, grade: '10th', group_name: 'Teen House' },
    { id: '1602', name: 'Jami Disman', divisionId: 'teen_girls', age: 15, grade: '10th', group_name: 'Teen House' },

    // Junior Boys
    { id: '1701', name: 'Eddie Kirshner', divisionId: 'junior_boys', age: 10, grade: '5th', group_name: 'Cabin E' },
    { id: '1702', name: 'Jesse Wayne', divisionId: 'junior_boys', age: 10, grade: '5th', group_name: 'Cabin E' },

    // Senior Boys
    { id: '1801', name: 'Adam Mayer- Schiaffo', divisionId: 'senior_boys', age: 15, grade: '10th', group_name: 'Bunk 12' },
    { id: '1802', name: 'Asher Rhine', divisionId: 'senior_boys', age: 15, grade: '10th', group_name: 'Bunk 12' },
];

const TripCard = ({ trip, onDelete, onEdit, onManageRoster }: { trip: Trip, onDelete: () => void, onEdit: () => void, onManageRoster: () => void }) => {
    const formatDate = (dateString: string, endDateString?: string) => {
        const start = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

        if (endDateString) {
            const end = new Date(endDateString);
            return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
        }
        return start.toLocaleDateString('en-US', { ...options, year: 'numeric' });
    };

    const formatTime = (timeString: string) => {
        // Simple HH:mm parser
        const [hours, minutes] = timeString.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;

    };

    return (
        <View style={[styles.card, trip.status === 'pending' ? styles.cardBorderRed : styles.cardBorderGreen]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                    {/* Title and Badges Column */}
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.cardTitle}>{trip.name}</Text>
                        <View style={styles.tagsRow}>
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeBadgeText}>{trip.type}</Text>
                            </View>
                            <StatusBadge status={trip.status} />
                        </View>
                    </View>

                    {/* Action Icons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.manageBtn} onPress={onManageRoster}>
                            <Ionicons name="person" size={14} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
                            <Ionicons name="pencil" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
                            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Secondary Info */}
                <View style={{ marginTop: 4 }}>
                    {trip.is_multi_day && (
                        <View style={[styles.durationBadge, { marginBottom: 8, marginTop: 4 }]}>
                            <Text style={styles.durationBadgeText}>3-Day Trip</Text>
                        </View>
                    )}
                    <Text style={styles.destinationText}>Destination: {trip.destination || 'N/A'}</Text>
                    <Text style={styles.chaperoneText}>Chaperone: {trip.chaperone || 'N/A'}</Text>
                </View>
            </View>

            {/* Grid Stats */}
            <View style={styles.statsGrid}>
                {/* Date */}
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                        <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Date</Text>
                        <Text style={styles.statValue}>{formatDate(trip.date, trip.end_date)}</Text>
                    </View>
                </View>

                {/* Attending */}
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                        <Ionicons name="people-outline" size={18} color="#16a34a" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Attending</Text>
                        <Text style={styles.statValue}>{trip.attendingCount}</Text>
                    </View>
                </View>

                {/* Departure */}
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#fff7ed' }]}>
                        <Ionicons name="time-outline" size={18} color="#ea580c" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Departure</Text>
                        <Text style={styles.statValue}>{trip.departure_time ? formatTime(trip.departure_time) : 'N/A'}</Text>
                    </View>
                </View>

                {/* Return */}
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#f3f4f6' }]}>
                        <Ionicons name="time-outline" size={18} color="#6b7280" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Return</Text>
                        <Text style={styles.statValue}>{trip.return_time ? formatTime(trip.return_time) : 'N/A'}</Text>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Event Type: {trip.event_type}</Text>
            </View>
        </View>
    );
};

const CalendarWidget = ({ selectedDate, onSelectDate }: { selectedDate: string, onSelectDate: (date: string) => void }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // Start Jan 2026 as per screenshot

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const totalDays = daysInMonth(month, year);
        const firstDay = firstDayOfMonth(month, year);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Days of current month
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(year, month, i).toISOString().split('T')[0]);
        }

        return days;
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    return (
        <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <Text key={day} style={styles.weekDayText}>{day}</Text>
                ))}
            </View>
            <View style={styles.daysGrid}>
                {generateCalendarDays().map((dateStr, index) => {
                    if (!dateStr) return <View key={`empty-${index}`} style={styles.dayCell} />;

                    const dayNum = dateStr.split('-')[2]; // Extract day part
                    const isSelected = selectedDate === dateStr;
                    const isToday = dateStr === '2026-01-27'; // Mock 'today'

                    return (
                        <TouchableOpacity
                            key={dateStr}
                            style={[
                                styles.dayCell,
                                isSelected && styles.selectedDayCell,
                                !isSelected && isToday && styles.todayCell
                            ]}
                            onPress={() => onSelectDate(dateStr)}
                        >
                            <Text style={[
                                styles.dayText,
                                isSelected && styles.selectedDayText,
                                !isSelected && isToday && styles.todayText
                            ]}>
                                {parseInt(dayNum)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

export const TransportScreen = ({ navigation }: any) => {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768; // Tablet/Desktop breakpoint

    const [searchQuery, setSearchQuery] = useState('');

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedDate, setSelectedDate] = useState('2026-01-27');

    // Filter State
    const [filterType, setFilterType] = useState('all');
    const [filterEventType, setFilterEventType] = useState('all');
    const [filterTransportType, setFilterTransportType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    // Modal State
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // Roster Modal State and Handlers
    const [rosterModalVisible, setRosterModalVisible] = useState(false);
    const [rosterTrip, setRosterTrip] = useState<Trip | null>(null);
    const [activeRosterTab, setActiveRosterTab] = useState<'division' | 'filter'>('division');
    const [rosterFilterDivision, setRosterFilterDivision] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCamperIds, setSelectedCamperIds] = useState<Set<string>>(new Set());

    const handleManageRoster = (trip: Trip) => {
        setRosterTrip(trip);
        setRosterModalVisible(true);
    };

    const toggleCamperSelection = (camperId: string) => {
        const newSelected = new Set(selectedCamperIds);
        if (newSelected.has(camperId)) {
            newSelected.delete(camperId);
        } else {
            newSelected.add(camperId);
        }
        setSelectedCamperIds(newSelected);
    };

    // Trips State
    const [trips, setTrips] = useState(MOCK_TRIPS);

    // Derived unique values for filters (mocking the backend aggregation)
    const uniqueTypes = Array.from(new Set(trips.map(t => t.type))).sort();
    const uniqueEventTypes = Array.from(new Set(trips.map(t => t.event_type))).sort();
    const uniqueTransportTypes = Array.from(new Set(trips.map(t => t.transportation_type))).sort();
    const uniqueStatuses = Array.from(new Set(trips.map(t => t.status))).sort();

    const filteredTrips = useMemo(() => {
        return trips.filter(trip => {
            // Search
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                const searchable = [trip.name, trip.destination, trip.chaperone, trip.type, trip.event_type].join(' ').toLowerCase();
                if (!searchable.includes(search)) return false;
            }
            // Filters
            if (filterType !== 'all' && trip.type !== filterType) return false;
            if (filterEventType !== 'all' && trip.event_type !== filterEventType) return false;
            if (filterTransportType !== 'all' && trip.transportation_type !== filterTransportType) return false;
            if (filterStatus !== 'all' && trip.status !== filterStatus) return false;

            return true;
        }).sort((a, b) => {
            if (sortBy === 'type') return a.type.localeCompare(b.type);
            if (sortBy === 'destination') return a.destination.localeCompare(b.destination);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            // Default Date
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [searchQuery, filterType, filterEventType, filterTransportType, filterStatus, sortBy]);

    // Trips for the selected date in Calendar View
    const selectedDateTrips = useMemo(() => {
        return trips.filter(t => t.date === selectedDate);
    }, [selectedDate, trips]);

    // Delete Modal State and Handlers
    const [tripToDelete, setTripToDelete] = useState<string | null>(null);

    const handleDeleteTrip = () => {
        if (tripToDelete) {
            setTrips(prev => prev.filter(t => t.id !== tripToDelete));
            setTripToDelete(null);
        }
    };

    const renderDeleteConfirmationModal = () => (
        <Modal
            transparent
            animationType="fade"
            visible={!!tripToDelete}
            onRequestClose={() => setTripToDelete(null)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.deleteModalContent}>
                    <Text style={styles.deleteModalTitle}>Are you sure?</Text>
                    <Text style={styles.deleteModalText}>
                        This action cannot be undone. This will permanently delete the trip.
                    </Text>
                    <View style={styles.deleteModalButtons}>
                        <TouchableOpacity
                            style={styles.deleteModalCancelBtn}
                            onPress={() => setTripToDelete(null)}
                        >
                            <Text style={styles.deleteModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteModalDeleteBtn}
                            onPress={handleDeleteTrip}
                        >
                            <Text style={styles.deleteModalDeleteText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );


    const renderFilterModal = () => {
        if (!activeModal) return null;

        let options: string[] = [];
        let currentVal = '';
        let setVal: (val: string) => void = () => { };
        let title = '';

        switch (activeModal) {
            case 'type':
                // Match screenshot specific options
                options = ['All Types', 'field_trip', 'sporting_event'];
                currentVal = filterType === 'all' ? 'All Types' : filterType;
                setVal = (val) => setFilterType(val === 'All Types' ? 'all' : val);
                title = 'Select Type';
                break;
            case 'eventType':
                options = ['all', ...uniqueEventTypes];
                currentVal = filterEventType;
                setVal = setFilterEventType;
                title = 'Select Event Type';
                break;
            case 'transportType':
                options = ['all', ...uniqueTransportTypes];
                currentVal = filterTransportType;
                setVal = setFilterTransportType;
                title = 'Select Transport Type';
                break;
            case 'status':
                options = ['all', ...uniqueStatuses];
                currentVal = filterStatus;
                setVal = setFilterStatus;
                title = 'Select Status';
                break;
            case 'sort':
                options = ['date', 'type', 'destination', 'status'];
                currentVal = sortBy;
                setVal = setSortBy;
                title = 'Sort By';
                break;
        }

        return (
            <Modal
                transparent
                animationType="slide"
                visible={!!activeModal}
                onRequestClose={() => setActiveModal(null)}
            >
                <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
                    <View style={styles.pickerModalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.pickerModalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.pickerTitle}>{title}</Text>
                                    <TouchableOpacity onPress={() => setActiveModal(null)}>
                                        <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {options.map((opt) => (
                                        <TouchableOpacity
                                            key={opt}
                                            style={styles.pickerOption}
                                            onPress={() => {
                                                setVal(opt);
                                                setActiveModal(null);
                                            }}
                                        >
                                            <Text style={styles.pickerOptionText}>
                                                {opt === 'all' ? `All ${title.replace('Select ', '')}s` : opt}
                                            </Text>
                                            {currentVal === opt && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        );
    };

    const FilterChip = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
        <TouchableOpacity
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={onPress}
        >
            <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
            <Ionicons
                name="chevron-down"
                size={14}
                color={active ? theme.colors.text : theme.colors.textSecondary}
            />
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.topRow}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transportation</Text>
            </View>
            <Text style={styles.headerSubtitle}>Manage field trips and sporting event transportation</Text>

            {/* Toolbar Actions */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbarScroll} contentContainerStyle={styles.toolbarContent}>
                {/* View Toggle */}
                <View style={styles.viewToggle}>
                    <TouchableOpacity
                        style={viewMode === 'list' ? styles.viewToggleBtnActive : styles.viewToggleBtn}
                        onPress={() => setViewMode('list')}
                    >
                        <Ionicons name="list" size={16} color={viewMode === 'list' ? "#fff" : theme.colors.text} />
                        <Text style={viewMode === 'list' ? styles.viewToggleTextActive : styles.viewToggleText}>List</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={viewMode === 'calendar' ? styles.viewToggleBtnActive : styles.viewToggleBtn}
                        onPress={() => setViewMode('calendar')}
                    >
                        <Ionicons name="calendar-outline" size={16} color={viewMode === 'calendar' ? "#fff" : theme.colors.text} />
                        <Text style={viewMode === 'calendar' ? styles.viewToggleTextActive : styles.viewToggleText}>Calendar</Text>
                    </TouchableOpacity>
                </View>

                {/* Help */}
                <TouchableOpacity style={styles.iconButton} onPress={() => setShowHelpModal(true)}>
                    <Ionicons name="help-circle-outline" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {/* Upload CSV */}
                <TouchableOpacity style={styles.actionButtonSecondary}>
                    <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.text} />
                    <Text style={styles.actionButtonTextSecondary}>Upload CSV</Text>
                </TouchableOpacity>

                {/* Add Trip */}
                <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleAddTrip}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.actionButtonTextPrimary}>Add Trip</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search trips..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>

            {/* Horizontal Filter Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
                <FilterChip
                    label={filterType === 'all' ? 'All Types' : filterType}
                    active={filterType !== 'all'}
                    onPress={() => setActiveModal('type')}
                />
                <FilterChip
                    label={filterEventType === 'all' ? 'All Event Types' : filterEventType}
                    active={filterEventType !== 'all'}
                    onPress={() => setActiveModal('eventType')}
                />
                <FilterChip
                    label={filterTransportType === 'all' ? 'All Transport...' : filterTransportType}
                    active={filterTransportType !== 'all'}
                    onPress={() => setActiveModal('transportType')}
                />
                <FilterChip
                    label={filterStatus === 'all' ? 'All Statuses' : filterStatus}
                    active={filterStatus !== 'all'}
                    onPress={() => setActiveModal('status')}
                />
                <FilterChip
                    label={`Sort by ${sortBy}`}
                    active={sortBy !== 'date'}
                    onPress={() => setActiveModal('sort')}
                />
                {(filterType !== 'all' || filterEventType !== 'all' || filterTransportType !== 'all' || filterStatus !== 'all' || searchQuery !== '') && (
                    <TouchableOpacity
                        style={styles.clearFiltersBtn}
                        onPress={() => {
                            setFilterType('all');
                            setFilterEventType('all');
                            setFilterTransportType('all');
                            setFilterStatus('all');
                            setSearchQuery('');
                            setSortBy('date');
                        }}
                    >
                        <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.clearFiltersText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );

    const renderCalendarView = () => {
        const selectedDateDisplay = new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const tripList = (
            selectedDateTrips.length === 0 ? (
                <Text style={styles.noEventsText}>No trips scheduled for this date</Text>
            ) : (
                <View style={{ gap: 12 }}>
                    {selectedDateTrips.map(trip => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            onDelete={() => setTripToDelete(trip.id)}
                            onEdit={() => handleEditTrip(trip)}
                            onManageRoster={() => handleManageRoster(trip)}
                        />
                    ))}
                </View>
            )
        );

        if (isLargeScreen) {
            return (
                <ScrollView contentContainerStyle={[styles.calendarViewContent, { flexDirection: 'row', gap: 24 }]}>
                    <View style={{ flex: 1, maxWidth: 400 }}>
                        <CalendarWidget selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                    </View>
                    <View style={{ flex: 2 }}>
                        <Text style={[styles.selectedDateTitle, { fontSize: 24, marginBottom: 24 }]}>{selectedDateDisplay}</Text>
                        {tripList}
                    </View>
                </ScrollView>
            );
        }

        // Mobile Layout: Date Title -> Calendar -> Trips
        return (
            <ScrollView contentContainerStyle={styles.calendarViewContent}>
                <Text style={[styles.selectedDateTitle, { marginLeft: 4 }]}>
                    {selectedDateDisplay}
                </Text>

                <CalendarWidget selectedDate={selectedDate} onSelectDate={setSelectedDate} />

                <View style={styles.selectedDateContainer}>
                    {tripList}
                </View>
            </ScrollView>
        );
    };

    // Help Modal State
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [activeHelpTab, setActiveHelpTab] = useState('Staff');

    const helpTabs = ['Children', 'Staff', 'Medications', 'Trips', 'Menu', 'Awards', 'Daily Notes', 'Incidents', 'Calendar', 'Sports'];

    const renderHelpModal = () => (
        <Modal
            transparent
            animationType="fade"
            visible={showHelpModal}
            onRequestClose={() => setShowHelpModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.helpModalContent, isLargeScreen && styles.helpModalContentLarge]}>
                    <View style={styles.helpModalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.text} />
                            <Text style={styles.helpModalTitle}>CSV Upload Format Guide</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.helpModalBody} showsVerticalScrollIndicator={false}>
                        {/* Tabs */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.helpTabsScrollContent}
                            style={styles.helpTabsScroll}
                        >
                            {helpTabs.map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.helpTab, activeHelpTab === tab && styles.helpTabActive]}
                                    onPress={() => setActiveHelpTab(tab)}
                                >
                                    <Text style={[styles.helpTabText, activeHelpTab === tab && styles.helpTabTextActive]}>{tab}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Content */}
                        <View style={styles.helpContent}>
                            <Text style={styles.contentTitle}>Staff Directory</Text>
                            <Text style={styles.contentSubtitle}>CSV format for staff directory upload</Text>

                            <Text style={styles.sectionLabel}>Required Columns (first row):</Text>
                            <View style={styles.codeBlock}>
                                <Text style={styles.codeText}>name, email, phone, role, department, hire_date, leader_id, status, season</Text>
                            </View>

                            <Text style={styles.sectionLabel}>Example Data Row:</Text>
                            <View style={styles.codeBlock}>
                                <Text style={styles.codeText}>Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, &lt;leader_id&gt;, active, Summer 2024</Text>
                            </View>

                            <View style={styles.infoBox}>
                                <Text style={styles.infoBoxText}>
                                    <Text style={{ fontWeight: 'bold' }}>Important Notes:</Text> leader_id must be a valid UUID from staff table. hire_date format: YYYY-MM-DD
                                </Text>
                            </View>

                            <View style={styles.tipsBox}>
                                <Text style={styles.tipsTitle}>General Tips:</Text>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• First row must contain column names exactly as shown</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Use commas to separate values</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Leave fields empty for optional columns</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Maximum 1000 rows per upload</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• Dates must be in YYYY-MM-DD format</Text></View>
                                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• UUIDs can be obtained from the backend for existing records</Text></View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );



    // Modal State
    const [modalState, setModalState] = useState<{
        visible: boolean;
        mode: 'add' | 'edit';
        tripId?: string;
    }>({ visible: false, mode: 'add' });

    const initialTripData: Trip = {
        id: '',
        name: '',
        destination: '',
        date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_multi_day: false,
        departure_time: '',
        return_time: '',
        attendingCount: 0,
        chaperone: '',
        status: 'pending',
        type: 'Field Trip',
        event_type: 'field-trip',
        transportation_type: 'None',
        driver: '',
        meal: 'None',
        event_length: '',
        capacity: '',
        location_type: 'AWAY'
    };

    const [tripFormData, setTripFormData] = useState<Trip>(initialTripData);

    const handleEditTrip = (trip: Trip) => {
        setTripFormData({ ...trip });
        setModalState({ visible: true, mode: 'edit', tripId: trip.id });
    };

    const handleAddTrip = () => {
        setTripFormData({ ...initialTripData, id: Math.random().toString() }); // Simple ID for now
        setModalState({ visible: true, mode: 'add' });
    };

    const handleSaveTrip = () => {
        if (modalState.mode === 'add') {
            setTrips(prev => [tripFormData, ...prev]);
        } else {
            setTrips(prev => prev.map(t => t.id === modalState.tripId ? tripFormData : t));
        }
        setModalState({ ...modalState, visible: false });
    };

    // Picker State
    const [activePicker, setActivePicker] = useState<'startDate' | 'endDate' | 'departureTime' | 'returnTime' | 'type' | 'locationType' | 'status' | 'transportation_type' | 'meal' | null>(null);

    const handlePickerSelect = (value: string) => {
        if (!activePicker) return;

        if (activePicker === 'type') {
            setTripFormData({ ...tripFormData, type: value });
        } else if (activePicker === 'startDate') {
            setTripFormData({ ...tripFormData, date: value });
        } else if (activePicker === 'endDate') {
            setTripFormData({ ...tripFormData, end_date: value });
        } else if (activePicker === 'departureTime') {
            setTripFormData({ ...tripFormData, departure_time: value });
        } else if (activePicker === 'returnTime') {
            setTripFormData({ ...tripFormData, return_time: value });
        } else if (activePicker === 'status') {
            setTripFormData({ ...tripFormData, status: value as any });
        } else if (activePicker === 'transportation_type') {
            setTripFormData({ ...tripFormData, transportation_type: value });
        } else if (activePicker === 'meal') {
            setTripFormData({ ...tripFormData, meal: value });
        }
        setActivePicker(null);
    };

    const renderActionSheet = (title: string, options: string[], currentValue: string | undefined, displayModifier?: (val: string) => React.ReactNode, onSelect?: (val: string) => void) => (
        <View style={{ padding: 16 }}>
            <Text style={styles.pickerTitle}>{title}</Text>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt}
                    style={styles.pickerOption}
                    onPress={() => onSelect ? onSelect(opt) : handlePickerSelect(opt)}
                >
                    <Text style={styles.pickerOptionText}>{displayModifier ? displayModifier(opt) : opt}</Text>
                    {currentValue === opt && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closePickerBtn} onPress={() => setActivePicker(null)}>
                <Text style={styles.closePickerText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPickerModalContent = () => {
        if (!activePicker) return null;

        if (activePicker === 'startDate' || activePicker === 'endDate') {
            const currentSelected = activePicker === 'startDate' ? tripFormData.date : (tripFormData.end_date || tripFormData.date);
            return (
                <View style={{ padding: 16 }}>
                    <Text style={styles.pickerTitle}>Select {activePicker === 'startDate' ? 'Start' : 'End'} Date</Text>
                    <CalendarWidget
                        selectedDate={currentSelected}
                        onSelectDate={(date) => handlePickerSelect(date)}
                    />
                    <TouchableOpacity style={styles.closePickerBtn} onPress={() => setActivePicker(null)}>
                        <Text style={styles.closePickerText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activePicker === 'departureTime' || activePicker === 'returnTime') {
            // Generate time slots (every 30 mins for demo)
            const times = [];
            for (let i = 6; i < 22; i++) {
                const hour = i % 12 || 12;
                const ampm = i < 12 ? 'AM' : 'PM';
                times.push(`${hour}:00 ${ampm}`);
                times.push(`${hour}:30 ${ampm}`);
            }

            return (
                <View style={{ padding: 16, maxHeight: 400 }}>
                    <Text style={styles.pickerTitle}>Select Time</Text>
                    <ScrollView style={{ maxHeight: 300 }}>
                        {times.map(time => (
                            <TouchableOpacity
                                key={time}
                                style={styles.pickerOption}
                                onPress={() => handlePickerSelect(time)}
                            >
                                <Text style={styles.pickerOptionText}>{time}</Text>
                                {((activePicker === 'departureTime' && tripFormData.departure_time === time) ||
                                    (activePicker === 'returnTime' && tripFormData.return_time === time)) &&
                                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                }
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.closePickerBtn} onPress={() => setActivePicker(null)}>
                        <Text style={styles.closePickerText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activePicker === 'type') {
            const typeOptions = [
                { label: 'Field Trip', value: 'field_trip' },
                { label: 'Sporting Event', value: 'sporting_event' },
                { label: 'Other', value: 'other' }
            ];
            return renderActionSheet(
                'Select Type',
                typeOptions.map(t => t.label),
                typeOptions.find(t => t.value === tripFormData.type)?.label || tripFormData.type,
                undefined,
                (label) => {
                    const val = typeOptions.find(t => t.label === label)?.value || label;
                    setTripFormData({ ...tripFormData, type: val });
                    setActivePicker(null);
                }
            );
        }

        if (activePicker === 'locationType') {
            return renderActionSheet('Select Location Type', ['AWAY', 'ON SITE'], tripFormData.location_type || 'AWAY', undefined, (val) => {
                setTripFormData({ ...tripFormData, location_type: val });
                setActivePicker(null);
            });
        }

        if (activePicker === 'status') {
            return renderActionSheet('Select Status', ['pending', 'approved', 'confirmed'], tripFormData.status, (status) => <StatusBadge status={status as any} />);
        }

        if (activePicker === 'transportation_type') {
            return renderActionSheet('Select Transportation', ['Bus', 'Van', 'None'], tripFormData.transportation_type);
        }

        if (activePicker === 'meal') {
            return renderActionSheet('Select Meal', ['None', 'Packed Lunch', 'Cafeteria', 'Restaurant'], tripFormData.meal);
        }
    };


    const renderPickerModal = () => (
        <Modal
            transparent
            animationType="slide"
            visible={!!activePicker}
            onRequestClose={() => setActivePicker(null)}
        >
            <TouchableWithoutFeedback onPress={() => setActivePicker(null)}>
                <View style={styles.pickerModalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.pickerModalContent}>
                            {renderPickerModalContent()}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const renderTripFormModal = () => (
        <Modal
            transparent
            animationType="slide"
            visible={modalState.visible}
            onRequestClose={() => setModalState({ ...modalState, visible: false })}
        >
            <View style={styles.tripFormModalOverlay}>
                <View style={styles.tripFormModalContent}>
                    <View style={styles.tripFormModalHeader}>
                        <Text style={styles.tripFormModalTitle} numberOfLines={1}>{modalState.mode === 'add' ? 'New Activity/Field Trip' : 'Edit Activity/Field Trip'}</Text>
                        <TouchableOpacity onPress={() => setModalState({ ...modalState, visible: false })} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.tripFormModalBody} contentContainerStyle={styles.tripFormScrollContent} showsVerticalScrollIndicator={false}>

                        {/* Multi-Day Toggle - Top as per screenshot */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <MaterialCommunityIcons name="calendar-range" size={20} color={theme.colors.text} />
                                    <Text style={styles.toggleLabel}>Multi-Day Event</Text>
                                </View>
                                <Text style={styles.toggleHelper}>Enable this for events spanning multiple days</Text>
                            </View>
                            <Switch
                                value={tripFormData.is_multi_day}
                                onValueChange={(val) => setTripFormData({ ...tripFormData, is_multi_day: val })}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={'#fff'}
                            />
                        </View>

                        {/* Dates Row */}
                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Start Date</Text>
                                <TouchableOpacity style={styles.dateInputContainer} onPress={() => setActivePicker('startDate')}>
                                    <Text style={styles.dateInputText}>{tripFormData.date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>End Date</Text>
                                <TouchableOpacity
                                    style={[styles.dateInputContainer, !tripFormData.is_multi_day && { backgroundColor: theme.colors.background }]}
                                    onPress={() => tripFormData.is_multi_day && setActivePicker('endDate')}
                                    disabled={!tripFormData.is_multi_day}
                                >
                                    <Text style={[styles.dateInputText, !tripFormData.is_multi_day && { color: theme.colors.textSecondary }]}>
                                        {tripFormData.is_multi_day ? (tripFormData.end_date || 'mm/dd/yyyy') : 'mm/dd/yyyy'}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={!tripFormData.is_multi_day ? theme.colors.textSecondary : theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {tripFormData.is_multi_day && (
                            <View style={styles.selectedBadge}>
                                <Text style={styles.selectedBadgeText}>2-Day Event</Text>
                            </View>
                        )}

                        {/* Title */}
                        <View style={[styles.formGroup, { marginTop: 16 }]}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Junior Hershey/Dorney Trip"
                                value={tripFormData.name}
                                onChangeText={(text) => setTripFormData({ ...tripFormData, name: text })}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        {/* Activity Type */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Activity Type</Text>
                            <TouchableOpacity style={styles.typeSelector} onPress={() => setActivePicker('type')}>
                                <Text style={styles.typeSelectorText}>{tripFormData.type}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Location Type (New Field) */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Location Type</Text>
                            <TouchableOpacity style={styles.typeSelector} onPress={() => setActivePicker('locationType')}>
                                <Text style={styles.typeSelectorText}>{tripFormData.location_type || 'AWAY'}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Divisions (Select Multiple) */}
                        <View style={styles.formGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={[styles.label, { marginBottom: 0 }]}>Divisions (select multiple)</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity style={styles.actionButtonSecondary}>
                                        <Text style={styles.actionButtonTextSecondary}>Select All</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionButtonSecondary}>
                                        <Text style={styles.actionButtonTextSecondary}>Deselect All</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>


                        {/* Footer Buttons */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setModalState({ ...modalState, visible: false })}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitButton} onPress={handleSaveTrip}>
                                <Text style={styles.submitButtonText}>{modalState.mode === 'add' ? 'Add Trip' : 'Save Changes'}</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderRosterModal = () => {
        // Calculate allergy counts
        const selectedCampersList = MOCK_CAMPERS.filter(c => selectedCamperIds.has(c.id));
        const allergyCount = selectedCampersList.filter(c => c.allergies).length;

        return (
            <Modal
                transparent
                animationType="slide"
                visible={rosterModalVisible}
                onRequestClose={() => setRosterModalVisible(false)}
            >
                <View style={styles.rosterModalOverlay}>
                    <View style={styles.rosterModalContent}>
                        <View style={styles.rosterModalHeader}>
                            <Text style={styles.rosterModalTitle} numberOfLines={2}>Manage Roster for {rosterTrip?.name}</Text>
                            <TouchableOpacity onPress={() => setRosterModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rosterTabsContainer}>
                            <TouchableOpacity
                                style={[styles.rosterTab, activeRosterTab === 'division' && styles.rosterTabActive]}
                                onPress={() => setActiveRosterTab('division')}
                            >
                                <Text style={[styles.rosterTabText, activeRosterTab === 'division' && styles.rosterTabTextActive]}>By Division</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.rosterTab, activeRosterTab === 'filter' && styles.rosterTabActive]}
                                onPress={() => setActiveRosterTab('filter')}
                            >
                                <Text style={[styles.rosterTabText, activeRosterTab === 'filter' && styles.rosterTabTextActive]}>Filter</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.helpModalBody} showsVerticalScrollIndicator={false}>
                            {activeRosterTab === 'division' ? (
                                MOCK_DIVISIONS.map(division => {
                                    const divisionCampers = MOCK_CAMPERS.filter(c => c.divisionId === division.id);
                                    const divisionSelectedCount = divisionCampers.filter(c => selectedCamperIds.has(c.id)).length;

                                    return (
                                        <View key={division.id} style={styles.divisionSection}>
                                            <View style={styles.divisionHeader}>
                                                <Text style={styles.divisionTitle}>{division.name}</Text>
                                                <Text style={styles.divisionCount}>{divisionSelectedCount} / {division.totalCount}</Text>
                                            </View>
                                            <View style={styles.camperList}>
                                                {divisionCampers.map(camper => (
                                                    <TouchableOpacity
                                                        key={camper.id}
                                                        style={[
                                                            styles.camperItem,
                                                            selectedCamperIds.has(camper.id) && styles.camperItemSelected
                                                        ]}
                                                        onPress={() => toggleCamperSelection(camper.id)}
                                                    >
                                                        <View style={[styles.radioCircle, selectedCamperIds.has(camper.id) && styles.radioCircleSelected]}>
                                                            {selectedCamperIds.has(camper.id) && <View style={styles.radioInnerCircle} />}
                                                        </View>
                                                        <Text style={styles.camperName}>{camper.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    )
                                })
                            ) : (
                                <View>
                                    <Text style={styles.filterLabel}>Filter by Division</Text>
                                    <TouchableOpacity
                                        style={styles.filterDropdown}
                                        onPress={() => setIsDropdownOpen(true)}
                                    >
                                        <Text style={styles.filterDropdownText}>
                                            {rosterFilterDivision === 'all' ? 'All Divisions' : MOCK_DIVISIONS.find(d => d.id === rosterFilterDivision)?.name}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>

                                    <View style={styles.selectedHeader}>
                                        <Text style={styles.selectedLabel}>Selected Campers</Text>
                                        <View style={styles.selectedBadge}>
                                            <Text style={styles.selectedBadgeText}>{selectedCamperIds.size} selected</Text>
                                        </View>
                                    </View>

                                    <View style={styles.camperList}>
                                        {MOCK_CAMPERS
                                            .filter(c => rosterFilterDivision === 'all' || c.divisionId === rosterFilterDivision)
                                            .map(camper => {
                                                const divisionName = MOCK_DIVISIONS.find(d => d.id === camper.divisionId)?.name;
                                                return (
                                                    <TouchableOpacity
                                                        key={camper.id}
                                                        style={[
                                                            styles.camperItem,
                                                            selectedCamperIds.has(camper.id) && styles.camperItemSelected
                                                        ]}
                                                        onPress={() => toggleCamperSelection(camper.id)}
                                                    >
                                                        <View style={[styles.radioCircle, selectedCamperIds.has(camper.id) && styles.radioCircleSelected]}>
                                                            {selectedCamperIds.has(camper.id) && <View style={styles.radioInnerCircle} />}
                                                        </View>
                                                        <Text style={styles.camperName}>
                                                            {camper.name} <Text style={{ color: theme.colors.textSecondary }}>- {divisionName}</Text>
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.rosterFooter}>
                            <Text style={styles.rosterFooterText}>Total selected: {selectedCamperIds.size} campers</Text>
                            <View style={styles.rosterFooterButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setRosterModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={() => {
                                        setRosterModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.submitButtonText}>Save Roster</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </View>
                </View>
            </Modal>
        );
    };

    const renderDivisionFilterModal = () => (
        <Modal
            transparent
            animationType="slide"
            visible={isDropdownOpen}
            onRequestClose={() => setIsDropdownOpen(false)}
        >
            <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
                <View style={styles.pickerModalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.pickerModalContent}>
                            <Text style={styles.pickerTitle}>Select Division</Text>
                            <ScrollView style={{ maxHeight: 400 }}>
                                <TouchableOpacity
                                    style={[styles.pickerOption, rosterFilterDivision === 'all' && styles.modalOptionActive]}
                                    onPress={() => {
                                        setRosterFilterDivision('all');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    <Text style={[styles.pickerOptionText, rosterFilterDivision === 'all' && styles.modalOptionTextActive]}>All Divisions</Text>
                                    {rosterFilterDivision === 'all' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                                </TouchableOpacity>
                                {MOCK_DIVISIONS.map(division => (
                                    <TouchableOpacity
                                        key={division.id}
                                        style={[styles.pickerOption, rosterFilterDivision === division.id && styles.modalOptionActive]}
                                        onPress={() => {
                                            setRosterFilterDivision(division.id);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={[styles.pickerOptionText, rosterFilterDivision === division.id && styles.modalOptionTextActive]}>{division.name}</Text>
                                        {rosterFilterDivision === division.id && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={styles.closePickerBtn} onPress={() => setIsDropdownOpen(false)}>
                                <Text style={styles.closePickerText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {renderDeleteConfirmationModal()}
            {renderFilterModal()}
            {renderHelpModal()}
            {renderTripFormModal()}
            {renderRosterModal()}
            {renderPickerModal()}
            {renderDivisionFilterModal()}
            {renderHeader()}
            {viewMode === 'list' ? (
                <FlatList
                    data={filteredTrips}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TripCard
                            trip={item}
                            onDelete={() => setTripToDelete(item.id)}
                            onEdit={() => handleEditTrip(item)}
                            onManageRoster={() => handleManageRoster(item)}
                        />
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No trips found matching your filters.</Text>
                        </View>
                    }
                />
            ) : (
                renderCalendarView()
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    listContent: {
        paddingBottom: theme.spacing.xl,
    },
    headerContainer: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xs,
    },
    menuButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        marginLeft: theme.spacing.sm,
    },
    addButton: {
        backgroundColor: theme.colors.secondary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        marginLeft: theme.spacing.xs,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        height: '100%',
    },
    filterScroll: {
        marginBottom: theme.spacing.xs,
    },
    filterContent: {
        paddingVertical: 4,
        gap: 8,
        alignItems: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 4,
    },
    filterChipActive: {
        backgroundColor: '#eff6ff', // light blue tint
        borderColor: theme.colors.secondary,
    },
    filterText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    filterTextActive: {
        fontSize: 13,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    clearFiltersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
    },
    clearFiltersText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    emptyState: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        maxHeight: 400,
        ...theme.shadows.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalOption: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalOptionActive: {
        backgroundColor: '#eff6ff',
        borderRadius: theme.borderRadius.sm,
    },
    modalOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    modalOptionTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    // Card Styles
    card: {
        backgroundColor: '#FFF8F5', // Light beige/pink background
        marginHorizontal: theme.spacing.md,
        // marginBottom removed in favor of ItemSeparatorComponent
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.card,
        borderLeftWidth: 4,
        padding: theme.spacing.md,
    },
    cardBorderRed: {
        borderLeftColor: theme.colors.danger,
        backgroundColor: '#FFF8F5', // Light beige/pink background
    },
    cardBorderGreen: {
        borderLeftColor: theme.colors.success,
        backgroundColor: '#FFF8F5', // Light beige/pink background
    },
    cardHeader: {
        marginBottom: theme.spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    manageBtn: {
        backgroundColor: '#f97316', // Orange
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBtn: {
        padding: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: theme.spacing.sm,
    },
    typeBadge: {
        backgroundColor: '#e0f2fe', // light blue
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeBadgeText: {
        fontSize: 12,
        color: '#0284c7', // dark blue
        fontWeight: '500',
    },
    durationBadge: {
        backgroundColor: '#0ea5e9', // bright blue
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    durationBadgeText: {
        fontSize: 11,
        color: '#ffffff',
        fontWeight: '600',
    },
    destinationText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    chaperoneText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12, // Reduced gap slightly
        marginBottom: theme.spacing.md,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flexBasis: '45%', // base width but allows growing/shrinking if needed
        flexGrow: 1,
        minWidth: 140, // Ensure it doesn't get too small
        gap: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11, // Slightly smaller label
        color: theme.colors.textSecondary,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        flexShrink: 1, // Allow text to wrap if very long
    },

    // Roster Modal Styles
    rosterTabsContainer: {
        flexDirection: 'row',
        padding: 4,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        margin: theme.spacing.md,
    },
    rosterTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    rosterTabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    rosterTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    rosterTabTextActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    divisionSection: {
        marginBottom: 16,
    },
    divisionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    divisionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    divisionCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    camperList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
    },
    camperItem: {
        width: '50%', // 2 columns
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        paddingRight: 8,
        paddingLeft: 4,
        gap: 8,
        borderRadius: 6,
    },
    camperItemSelected: {
        backgroundColor: '#f0fdf4',
    },
    camperName: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    radioCircleSelected: {
        borderColor: theme.colors.primary,
    },
    radioInnerCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
    },
    rosterFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rosterFooterText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    rosterFooterButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    // Roster Modal Bottom Sheet Styles
    rosterModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    rosterModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        width: '100%',
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    rosterModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 12,
    },
    rosterModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        flexWrap: 'wrap',
    },
    closeButton: {
        padding: 4,
        marginTop: -4,
    },
    // Trip Form Modal Bottom Sheet Styles
    tripFormModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tripFormModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    tripFormModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 12,
    },
    tripFormModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
    },
    tripFormModalBody: {
        flex: 1,
    },
    tripFormScrollContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    filterContentPlaceholder: {
        padding: 20,
        alignItems: 'center',
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        marginLeft: 16,
        color: theme.colors.text,
    },
    filterDropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    filterDropdownText: {
        fontSize: 15,
        color: theme.colors.text,
    },
    selectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 8,
    },
    selectedLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    selectedBadge: {
        backgroundColor: '#0044CC',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    selectedBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Dropdown Styles
    dropdownListContainer: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 250,
        ...theme.shadows.card,
        zIndex: 2000, // Ensure it sits above everything
    },
    dropdownList: {
        flex: 1,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    dropdownItemActive: {
        backgroundColor: '#2563eb', // Blue selection
    },
    dropdownItemText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownItemTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    camperDivisionName: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: theme.spacing.sm,
    },
    footerText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    // Toolbar Styles
    toolbarScroll: {
        marginBottom: theme.spacing.sm,
    },
    toolbarContent: {
        paddingHorizontal: 4,
        gap: 8,
        alignItems: 'center',
        paddingBottom: 4,
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    viewToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: theme.colors.surface,
    },
    viewToggleBtnActive: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: '#2563eb', // Blue
    },
    viewToggleText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
    },
    viewToggleTextActive: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '500',
    },
    iconButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    actionButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    actionButtonTextSecondary: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
    },
    actionButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: '#2563eb', // Blue
        borderRadius: theme.borderRadius.md,
    },
    actionButtonTextPrimary: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '500',
    },
    // Calendar Styles
    calendarViewContent: {
        padding: theme.spacing.md,
    },
    calendarContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    navBtn: {
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 4,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    weekDayText: {
        width: 32,
        textAlign: 'center',
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 8,
    },
    dayCell: {
        width: '14.28%', // 100/7
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedDayCell: {
        backgroundColor: '#2563eb',
        borderRadius: 4,
    },
    todayCell: {
        borderWidth: 1,
        borderColor: '#2563eb',
        borderRadius: 4,
    },
    dayText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    selectedDayText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    todayText: {
        color: '#2563eb',
        fontWeight: '600',
    },
    selectedDateContainer: {
        paddingHorizontal: 4,
    },
    selectedDateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    noEventsText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
        fontSize: 14,
    },
    // Help Modal Styles
    helpModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        width: '100%',
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    helpModalContentLarge: {
        width: '60%',
        alignSelf: 'center',
        maxHeight: '80%',
    },
    helpModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    helpModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    helpModalBody: {
    },
    helpTabsScroll: {
        marginBottom: theme.spacing.md,
    },
    helpTabsScrollContent: {
        gap: 8,
        paddingHorizontal: 4, // Add a little padding for potential shadows
        paddingBottom: 4,
    },
    helpTab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    helpTabActive: {
        backgroundColor: '#fff',
        borderColor: 'transparent',
        borderBottomWidth: 0,
        borderRadius: 16,
        ...theme.shadows.card, // Fallback to card shadow since sm might not exist
    },
    helpTabText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    helpTabTextActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    helpContent: {
        marginTop: 8,
    },
    contentTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    contentSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 12,
        marginBottom: 8,
    },
    codeBlock: {
        backgroundColor: '#f1f5f9', // slate-100
        padding: 12,
        borderRadius: 6,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    codeText: {
        fontFamily: 'monospace', // Platform specific font handling usually needed, but this works for basic web/some mobile
        fontSize: 12,
        color: '#334155', // slate-700
    },
    infoBox: {
        backgroundColor: '#eff6ff', // blue-50
        padding: 12,
        borderRadius: 6,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6', // blue-500
    },
    infoBoxText: {
        fontSize: 13,
        color: '#1e40af', // blue-800
        lineHeight: 20,
    },
    tipsBox: {
        backgroundColor: '#fffbeb', // amber-50
        padding: 12,
        borderRadius: 6,
        marginTop: 8,
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400e', // amber-800
        marginBottom: 8,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingLeft: 4,
    },
    bulletText: {
        fontSize: 13,
        color: '#92400e', // amber-800
        flex: 1,
        lineHeight: 20,
    },
    // Form Styles
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    helperText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    helperTextSmall: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: theme.colors.text,
        backgroundColor: '#fff',
    },
    typeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: '#2563eb', // Blue border for focus/active state
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    typeSelectorText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    toggleHelper: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    dateInputText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
        paddingTop: 16,
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    submitButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#0044CC', // Primary blue
    },
    submitButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    // Picker Modal Styles
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
        width: '100%',
        maxHeight: '70%',
        ...theme.shadows.card,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    closePickerBtn: {
        marginTop: 16,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: theme.borderRadius.md,
    },
    closePickerText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    // Delete Confirmation Modal Styles
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        alignSelf: 'center',
        ...theme.shadows.card,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    deleteModalText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 24,
        lineHeight: 20,
    },
    deleteModalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    deleteModalCancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#fff',
    },
    deleteModalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    deleteModalDeleteBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#2563eb', // Primary Blue
    },
    deleteModalDeleteText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
