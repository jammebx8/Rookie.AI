import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { supabase } from "../src/utils/supabase";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: any;
  interested: string;
  price?: string;
  category: string;
}

interface UserData {
  id?: string;
  email?: string;
  name: string;
  gender?: string;
  exam?: string;
  avatar_url?: string;
}

const DUMMY_EVENTS: Event[] = [
  {
    id: '1',
    title: '10th International Agri & Horti Technology Expo 2025',
    date: 'Fri, 26 Dec',
    time: '10:00 AM',
    location: 'CIAE Ground, Nabi Bagh, Berasia Road, Bhopal',
    image: require('../src/assets/images/event01.png'),

    interested: '91+ Interested',
    category: 'Technology',
  },
  {
    id: '2',
    title: 'Ferry Tales: Stories Across the Lake',
    date: 'Sat, 13 Dec',
    time: '04:00 PM',
    location: 'Bhopal - The City Of Lakes',
    image: require('../src/assets/images/event02.jpeg'),

    interested: '49+ Interested',
    category: 'Sports',
  },
  {
    id: '3',
    title: 'Gen WHY: A Millennial Spiral by Swati Sachdeva',
    date: 'Sat, 20 Dec',
    time: '06:00 PM',
    location: 'Hotel La Pearl: Bhopal',
    image: require('../src/assets/images/event06.jpeg'),

    interested: '836+ Interested',
    price: '₹ 599',
    category: 'Stand ups',
  },
  {
    id: '4',
    title: 'National Open Championship',
    date: 'Sun, 28 Dec',
    time: '12:00 AM',
    location: 'Bhopal City',
    image: require('../src/assets/images/event04.jpeg'),

    interested: '81+ Interested',
    category: 'Sports',
  },
  {
    id: '5',
    title: 'Rivayat-E-Bhopal',
    date: 'Wed, 17 Dec',
    time: '07:00 PM',
    location: 'Ravindra Bhawan Bhopal',
    image: require('../src/assets/images/event05.jpeg'),

    interested: '5+ Interested',
    price: 'Free',
    category: 'Concerts',
  },
  {
    id: '6',
    title: 'WordCamp Bhopal 2025',
    date: 'Sun, 21 Dec',
    time: '10:00 AM',
    location: 'Courtyard By Marriott Bhopal',
    image: require('../src/assets/images/event06.jpeg'),

    interested: '4+ Interested',
    category: 'Technology',
  },
  {
    id: '7',
    title: 'Multi Country Education Fair',
    date: 'Sat, 13 Dec',
    time: '09:30 AM',
    location: 'Global Reach Bhopal',
    image: require('../src/assets/images/event07.jpeg'),

    interested: '0+ Interested',
    price: 'Free',
    category: 'Self growth',
  },
  {
    id: '8',
    title: 'BLF 2026: Celebrating Literature, Art & Culture in Bhopal',
    date: 'Fri, 09 Jan',
    time: '09:00 AM',
    location: 'Bharat Bhavan Bhopal',
    image: require('../src/assets/images/event08.jpeg'),

    interested: '242+ Interested',
    category: 'Spiritual',
  },
];

const FILTER_CATEGORIES = ['All', 'Technology', 'Sports', 'Stand ups', 'Concerts', 'Self growth', 'Spiritual', 'Health', 'Politics'];

export default function Homepage() {
  const navigation = useNavigation<any>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [events, setEvents] = useState<Event[]>(DUMMY_EVENTS);
  const [location, setLocation] = useState('Bhopal');
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    checkAuth();
    getUserLocation();
  }, []);

  const checkAuth = async () => {
    try {
      const onboarded = await AsyncStorage.getItem('@user_onboarded');
      const userStr = await AsyncStorage.getItem('@user');

      if (onboarded !== 'true' || !userStr) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
        return;
      }

      const user = JSON.parse(userStr);
      setUserData(user);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      setLoadingLocation(true);
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Reverse geocoding using OpenStreetMap Nominatim API (free, no API key needed)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'EventApp/1.0'
                }
              }
            );
            const data = await response.json();
            
            // Extract city name from the response
            const city = data.address?.city || 
                        data.address?.town || 
                        data.address?.village || 
                        data.address?.state || 
                        'Bhopal';
            
            setLocation(city);
          } catch (error) {
            console.error('Error reverse geocoding:', error);
            setLocation('Bhopal'); // Fallback to default
          } finally {
            setLoadingLocation(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocation('Bhopal'); // Fallback to default
          setLoadingLocation(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000 // Cache location for 5 minutes
        }
      );
    } else {
      // For native platforms, you can use expo-location
      setLocation('Bhopal');
    }
  };

  const handleLocationClick = () => {
    Alert.alert(
      'Change Location',
      'Do you want to refresh your current location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: getUserLocation
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@user');
              await AsyncStorage.removeItem('@user_onboarded');
              await supabase.auth.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: "Onboarding" }],
              });
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../src/assets/images/meetup_logo-removebg-preview.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.locationText}>Bhopal</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </View>
        </View>

        <View style={styles.headerCenter}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.createEventBtn} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color="#4A90E2" />
            <Text style={styles.createEventText}>Create Event</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.filterChipActive
              ]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText,
                selectedCategory === category && styles.filterChipTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events Grid */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.eventsGrid}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.noEventsContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.noEventsText}>No events found</Text>
            <Text style={styles.noEventsSubtext}>Try adjusting your search or filters</Text>
          </View>
        ) : (
          <View style={styles.eventsRow}>
            {filteredEvents.map((event) => (
              <TouchableOpacity 
                key={event.id} 
                style={styles.eventCard}
                activeOpacity={0.9}
              >
                <View style={styles.eventImageContainer}>
                  <Image 
                    source={event.image} 
                    style={styles.eventImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity style={styles.favoriteBtn}>
                    <Ionicons name="heart-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.eventDetails}>
                  <View style={styles.eventDateTime}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.eventDate}>{event.date}</Text>
                    <Text style={styles.eventTimeBullet}>•</Text>
                    <Text style={styles.eventTime}>{event.time}</Text>
                  </View>

                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>

                  <View style={styles.eventLocation}>
                    <Ionicons name="location-outline" size={14} color="#999" />
                    <Text style={styles.eventLocationText} numberOfLines={1}>
                      {event.location}
                    </Text>
                  </View>

                  <View style={styles.eventFooter}>
                    <View style={styles.interestedContainer}>
                      <View style={styles.avatarGroup}>
                        <View style={[styles.avatar, styles.avatar1]} />
                        <View style={[styles.avatar, styles.avatar2]} />
                        <View style={[styles.avatar, styles.avatar3]} />
                      </View>
                      <Text style={styles.interestedText}>{event.interested}</Text>
                    </View>
                    {event.price && (
                      <View style={styles.priceTag}>
                        <Text style={styles.priceText}>{event.price}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  // Header Styles
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: scale(60),
    height: verticalScale(60),
    marginRight: scale(16),
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  locationText: {
    fontSize: moderateScale(14),
    color: '#333',
    marginLeft: scale(4),
    marginRight: scale(2),
    fontWeight: '500',
  },
  headerCenter: {
    flex: 2,
    paddingHorizontal: scale(20),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(8),
    fontSize: moderateScale(14),
    color: '#333',
    outlineStyle: 'none',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  createEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A90E2',
    marginRight: scale(12),
  },
  createEventText: {
    fontSize: moderateScale(14),
    color: '#4A90E2',
    marginLeft: scale(6),
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    backgroundColor: '#E74C3C',
    borderRadius: 20,
  },
  logoutText: {
    fontSize: moderateScale(14),
    color: '#fff',
    marginLeft: scale(6),
    fontWeight: '600',
  },

  // Filter Section
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScroll: {
    paddingHorizontal: scale(20),
  },
  filterChip: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: scale(10),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterChipText: {
    fontSize: moderateScale(13),
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Content Area
  content: {
    flex: 1,
  },
  eventsGrid: {
    padding: scale(20),
  },
  eventsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Event Card
  eventCard: {
    width: '23.5%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: verticalScale(20),
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  eventImageContainer: {
    width: '100%',
    height: verticalScale(140),
    position: 'relative',


  },
  eventImage: {
    width: '100%',
    height: '100%',
   

  },
  favoriteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
  eventDetails: {
    padding: scale(12),
  },
  eventDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  eventDate: {
    fontSize: moderateScale(12),
    color: '#666',
    marginLeft: scale(4),
  },
  eventTimeBullet: {
    fontSize: moderateScale(12),
    color: '#666',
    marginHorizontal: scale(6),
  },
  eventTime: {
    fontSize: moderateScale(12),
    color: '#666',
  },
  eventTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(20),
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  eventLocationText: {
    fontSize: moderateScale(12),
    color: '#999',
    marginLeft: scale(4),
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interestedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGroup: {
    flexDirection: 'row',
    marginRight: scale(8),
  },
  avatar: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: '#fff',
    marginLeft: scale(-8),
  },
  avatar1: {
    backgroundColor: '#FF6B6B',
    marginLeft: 0,
  },
  avatar2: {
    backgroundColor: '#4ECDC4',
  },
  avatar3: {
    backgroundColor: '#FFE66D',
  },
  interestedText: {
    fontSize: moderateScale(11),
    color: '#666',
    fontWeight: '500',
  },
  priceTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 12,
  },
  priceText: {
    fontSize: moderateScale(11),
    color: '#333',
    fontWeight: '600',
  },

  // No Events
  noEventsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
  },
  noEventsText: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#666',
    marginTop: verticalScale(16),
  },
  noEventsSubtext: {
    fontSize: moderateScale(14),
    color: '#999',
    marginTop: verticalScale(8),
  },
});