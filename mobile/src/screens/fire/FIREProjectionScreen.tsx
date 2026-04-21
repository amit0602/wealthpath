import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParams } from '../../navigation/AppNavigator';
import { formatINR } from '../../utils/money';

type Props = NativeStackScreenProps<MainStackParams, 'FIREProjection'>;

export function FIREProjectionScreen({ navigation, route }: Props) {
  const { projections, corpusRequired, fireAge } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Year-by-Year Projection</Text>
        <Text style={styles.subtitle}>
          Target: {formatINR(corpusRequired)} by age {fireAge}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1 }]}>Year</Text>
          <Text style={[styles.th, { flex: 1 }]}>Age</Text>
          <Text style={[styles.th, { flex: 2 }]}>Portfolio</Text>
          <Text style={[styles.th, { flex: 2 }]}>Target %</Text>
        </View>

        {projections.map((p: any) => {
          const pct = corpusRequired > 0 ? Math.min(((Number(p.portfolioValue) / corpusRequired) * 100), 100) : 0;
          return (
            <View key={p.year} style={[styles.tableRow, p.isFireYear && styles.fireRow]}>
              <Text style={[styles.td, { flex: 1 }]}>{p.year}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{p.age}</Text>
              <Text style={[styles.td, styles.tdMono, { flex: 2 }, p.isFireYear && styles.fireTd]}>
                {formatINR(Number(p.portfolioValue))}
              </Text>
              <Text style={[styles.td, styles.tdMono, { flex: 2 }, p.isFireYear && styles.fireTd]}>
                {pct.toFixed(0)}%
              </Text>
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          For educational purposes only. Projections assume consistent returns. Real returns vary.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  back: { marginBottom: 12 },
  backText: { fontSize: 16, color: '#1B4332', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  content: { padding: 20, paddingBottom: 40 },
  tableHeader: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: '#E5E7EB', marginBottom: 4 },
  th: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fireRow: { backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 4, marginHorizontal: -4 },
  td: { fontSize: 14, color: '#374151' },
  tdMono: { fontVariant: ['tabular-nums'] },
  fireTd: { color: '#1B4332', fontWeight: '700' },
  disclaimer: { marginTop: 24, fontSize: 11, color: '#9CA3AF', lineHeight: 16, textAlign: 'center' },
});
