import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet
} from 'react-native';
import {
  X,
  Lock,
  DollarSign,
  Wallet,
  Bell,
  Palette,
  Globe,
  LogOut
} from 'lucide-react-native';

const MoreMenu = ({ isOpen, onClose, onLogout }) => {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.moreModalOverlay}>
        <TouchableOpacity 
          style={styles.moreBackdrop} 
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.moreMenu}>
          <ScrollView style={styles.moreMenuContent}>
            {/* Header */}
            <View style={styles.moreMenuHeader}>
              <View style={styles.profileSection}>
                <View style={styles.profileImage}>
                  <Image
                    source={require('./images/App_Logo.png')}
                    style={styles.profileImageContent}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>John Doe</Text>
                  <Text style={styles.profileEmail}>john@example.com</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem}>
                <Lock size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Passcode</Text>
                  <Text style={styles.menuItemSubtitle}>OFF</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <DollarSign size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Main Currency Setting</Text>
                  <Text style={styles.menuItemSubtitle}>LKR(Rs.)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Wallet size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Sub Currency Setting</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Bell size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Alarm Setting</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Palette size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Style</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Globe size={20} color="#6B7280" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Language Setting</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuItem, styles.logoutItem]}
                onPress={onLogout}
              >
                <LogOut size={20} color="#EF4444" style={styles.menuIcon} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.logoutText}>Logout</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  moreModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end'
  },
  moreBackdrop: {
    flex: 1
  },
  moreMenu: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%'
  },
  moreMenuContent: {
    flex: 1
  },
  moreMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  profileSection: {
    flexDirection: 'row'
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#ddd',
    marginRight: 12
  },
  profileImageContent: {
    width: '100%',
    height: '100%'
  },
  profileInfo: {
    justifyContent: 'center'
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827'
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280'
  },
  closeButton: {
    padding: 4
  },
  menuItems: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 10
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15
  },
  menuIcon: {
    marginRight: 12
  },
  menuItemContent: {
    flex: 1
  },
  menuItemTitle: {
    fontSize: 15,
    color: '#111827'
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#6B7280'
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 15
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 15
  }
});

export default MoreMenu;
