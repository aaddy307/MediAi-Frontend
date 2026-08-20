import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../../components/ui/Card';

export default function AdminTransactionsScreen({ navigation }) {
  const transactions = [
    { id: '1', title: 'Consultation Fee (Dr. Sarah)', amount: '+₹80.00', date: 'Today, 10:15 AM', type: 'consultation', status: 'completed' },
    { id: '2', title: 'Pharmacy Order #RX-994', amount: '+₹45.50', date: 'Today, 08:30 AM', type: 'pharmacy', status: 'completed' },
    { id: '3', title: 'Emergency Dispatch Fee', amount: '+₹120.00', date: 'Yesterday, 11:20 PM', type: 'emergency', status: 'completed' },
    { id: '4', title: 'Cardiology Session Payout', amount: '+₹95.00', date: '18 Aug 2026', type: 'consultation', status: 'completed' },
    { id: '5', title: 'Pharmacy Order #RX-882', amount: '+₹32.00', date: '17 Aug 2026', type: 'pharmacy', status: 'completed' },
  ];

  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradients.primary} style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total Revenue (Facility)</Text>
        <Text style={styles.heroAmount}>₹18,420.50</Text>
        <View style={styles.statRow}>
          <View>
            <Text style={styles.statVal}>₹12,300</Text>
            <Text style={styles.statSub}>Consultations</Text>
          </View>
          <View>
            <Text style={styles.statVal}>₹6,120</Text>
            <Text style={styles.statSub}>Pharmacy Sales</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle}>Transaction Activity</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card} padding={14}>
            <View style={styles.txRow}>
              <View style={styles.txIconBox}>
                <Ionicons
                  name={item.type === 'pharmacy' ? 'cube' : item.type === 'emergency' ? 'car-sport' : 'medkit'}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{item.title}</Text>
                <Text style={styles.txDate}>{item.date}</Text>
              </View>
              <Text style={styles.txAmount}>{item.amount}</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  heroCard: {
    margin: spacing.base,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius['2xl'],
    gap: 6,
    ...shadows.primary,
  },
  heroLabel: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  heroAmount: {
    fontSize: typography.fontSizes['3xl'],
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 10,
  },
  statVal: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  statSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
  },
  contentHeader: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    padding: spacing.base,
    gap: 8,
  },
  card: {
    backgroundColor: colors.surface,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: { flex: 1 },
  txTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  txDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
});
