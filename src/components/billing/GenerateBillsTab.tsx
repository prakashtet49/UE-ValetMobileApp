import React, {useState, useEffect, useMemo} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  FlatList,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../../utils/responsive';
import {useFocusEffect} from '@react-navigation/native';
import {getCompletedJobs, getCompletedJobsPending, type CompletedJob} from '../../api/jobs';
import {getTotalSummaryShifts, type TotalSummaryShiftsResponse} from '../../api/receipt';
import {COLORS, SHADOWS} from '../../constants/theme';
import {logError, getUserFriendlyMessage} from '../../utils/errorHandler';
import CustomDialog from '../CustomDialog';
import SettlementReceiptModal from './SettlementReceiptModal';
import BillingPrinterConnection from './BillingPrinterConnection';

type GenerateBillsTabProps = {
  onPrinterButtonRender?: (button: React.ReactNode) => void;
};

export default function GenerateBillsTab({onPrinterButtonRender}: GenerateBillsTabProps = {}) {
  const [refreshing, setRefreshing] = useState(false);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printingJob, setPrintingJob] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>;
  }>({visible: false, title: '', message: '', buttons: []});
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'summary'>('all');
  const [summaryData, setSummaryData] = useState<TotalSummaryShiftsResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useFocusEffect(
    React.useCallback(() => {
      loadCompletedJobs();
    }, [])
  );

  useEffect(() => {
    if (activeTab === 'summary') {
      loadTodaySummary();
    } else {
      // Reload jobs when switching between 'all' and 'pending' tabs
      loadCompletedJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadCompletedJobs() {
    try {
      setLoading(true);
      setError(null);
      // Use different API based on active tab
      const response = activeTab === 'pending' 
        ? await getCompletedJobsPending()
        : await getCompletedJobs();
      setCompletedJobs(response.data || []);
    } catch (error) {
      logError('GenerateBillsTab.loadCompletedJobs', error);
      setError(getUserFriendlyMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadTodaySummary() {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      
      // Format dates as YYYY-MM-DD
      const startDate = fromDate ? fromDate.toISOString().split('T')[0] : undefined;
      const endDate = toDate ? toDate.toISOString().split('T')[0] : undefined;
      
      const response = await getTotalSummaryShifts(startDate, endDate);
      setSummaryData(response);
    } catch (error) {
      logError('GenerateBillsTab.loadTodaySummary', error);
      setSummaryError(getUserFriendlyMessage(error));
    } finally {
      setSummaryLoading(false);
    }
  }

  const openDatePicker = async (type: 'from' | 'to') => {
    // Set calendar month to current date or selected date
    const currentDate = type === 'from' ? fromDate : toDate;
    setCalendarMonth(currentDate || new Date());
    
    if (Platform.OS === 'android') {
      try {
        // Use React Native's DatePickerAndroid (available in RN 0.82)
        const DatePickerAndroid = require('react-native').DatePickerAndroid;
        if (DatePickerAndroid) {
          const {action, year, month, day} = await DatePickerAndroid.open({
            date: type === 'from' ? (fromDate || new Date()) : (toDate || new Date()),
            mode: 'default',
          });
          
          if (action !== DatePickerAndroid.dismissedAction) {
            const selectedDate = new Date(year, month, day);
            if (type === 'from') {
              setFromDate(selectedDate);
            } else {
              setToDate(selectedDate);
            }
            // Auto-reload after date selection
            setTimeout(() => {
              loadTodaySummary();
            }, 100);
          }
        } else {
          // Fallback to calendar view if DatePickerAndroid not available
          setShowDatePicker(type);
        }
      } catch (error) {
        console.error('[GenerateBillsTab] DatePickerAndroid error:', error);
        // Fallback to calendar view on error
        setShowDatePicker(type);
      }
    } else {
      // iOS - show calendar view
      setShowDatePicker(type);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDateSelect = (date: Date) => {
    if (!showDatePicker) return;
    
    if (showDatePicker === 'from') {
      setFromDate(date);
    } else {
      setToDate(date);
    }
    setShowDatePicker(null);
    // Auto-reload after date selection
    setTimeout(() => {
      loadTodaySummary();
    }, 100);
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    // Day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const startDay = firstDay.getDay();
    // Total days in month
    const daysInMonth = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(calendarMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCalendarMonth(newMonth);
  };

  const isDateSelected = (date: Date | null): boolean => {
    if (!date || !showDatePicker) return false;
    const selectedDate = showDatePicker === 'from' ? fromDate : toDate;
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'summary') {
        await loadTodaySummary();
      } else {
        setSearchQuery('');
        await loadCompletedJobs();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateBill = (job: CompletedJob) => {
    setSelectedJob(job);
    setShowSettlementDialog(true);
  };

  const tabFilteredJobs = useMemo(() => {
    if (activeTab === 'all') {
      return completedJobs;
    } else if (activeTab === 'pending') {
      return completedJobs.filter(job => job.receiptPrinted === false);
    }
    return completedJobs;
  }, [completedJobs, activeTab]);

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) {
      return tabFilteredJobs;
    }

    const query = searchQuery.toLowerCase().trim();
    return tabFilteredJobs.filter(job => {
      if (job.vehicleNumber.toLowerCase().includes(query)) {
        return true;
      }
      if (job.tagNumber.toLowerCase().includes(query)) {
        return true;
      }
      if (job.customerPhone.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });
  }, [tabFilteredJobs, searchQuery]);

  const renderJobItem = ({item}: {item: CompletedJob}) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
        <Text style={styles.tagNumber}>Tag: {item.tagNumber}</Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{item.customerPhone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{item.locationDescription}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Slot:</Text>
          <Text style={styles.detailValue}>{item.slotOrZone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.durationValue}>{item.duration}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.printButton, printingJob === item.id && styles.printButtonDisabled]} 
        onPress={() => handleGenerateBill(item)}
        disabled={printingJob === item.id}>
        {printingJob === item.id ? (
          <>
            <ActivityIndicator size="small" color="#EF4444" />
            <Text style={styles.printButtonText}>Generating...</Text>
          </>
        ) : (
          <>
            <Text style={styles.printIcon}>📄</Text>
            <Text style={styles.printButtonText}>Generate Bill</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <BillingPrinterConnection onPrinterButtonRender={onPrinterButtonRender} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by vehicle, tag, or phone number..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.trim() && (
          <Text style={styles.searchResultText}>
            {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} found
          </Text>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}>
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
          onPress={() => setActiveTab('summary')}>
          <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
            Summary
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Dialog */}
      <CustomDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
        onDismiss={() => setDialog({...dialog, visible: false})}
      />

      <SettlementReceiptModal
        visible={showSettlementDialog}
        bookingId={selectedJob?.bookingId ?? null}
        vehicleNumber={selectedJob?.vehicleNumber ?? ''}
        onCancel={() => {
          setShowSettlementDialog(false);
          setSelectedJob(null);
        }}
        onHiddenAfterPrintSuccess={() => setShowSettlementDialog(false)}
        onPrintedAndFinished={() => {
          setSelectedJob(null);
          loadCompletedJobs();
        }}
      />

      {/* Content Area */}
      {activeTab === 'all' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gradientEnd} />
            <Text style={styles.loadingText}>Loading all jobs...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadCompletedJobs}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : completedJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No jobs found</Text>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No jobs match your search</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.retryButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredJobs}
            renderItem={renderJobItem}
            keyExtractor={(item, index) => item.id || item.bookingId || `job-${index}`}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'pending' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gradientEnd} />
            <Text style={styles.loadingText}>Loading pending jobs...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadCompletedJobs}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : tabFilteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyText}>No pending jobs found</Text>
            <Text style={styles.emptySubtext}>Jobs awaiting receipt printing</Text>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No jobs match your search</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.retryButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredJobs}
            renderItem={renderJobItem}
            keyExtractor={(item, index) => item.id || item.bookingId || `job-${index}`}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'summary' && (
        summaryLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gradientEnd} />
            <Text style={styles.loadingText}>Loading today's summary...</Text>
          </View>
        ) : summaryError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{summaryError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadTodaySummary}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !summaryData ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>No summary data available</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.summaryContainer}
            contentContainerStyle={styles.summaryContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}>
            
            {/* Date Filter Header */}
            <View style={styles.dateFilterContainer}>
              <View style={styles.dateFilterRow}>
                <TouchableOpacity 
                  style={[styles.dateInput, fromDate && styles.dateInputSelected]}
                  onPress={() => openDatePicker('from')}>
                  <Text style={styles.dateInputLabel}>From</Text>
                  <Text style={[styles.dateInputValue, !fromDate && styles.dateInputPlaceholder]}>
                    {formatDate(fromDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateInput, toDate && styles.dateInputSelected]}
                  onPress={() => openDatePicker('to')}>
                  <Text style={styles.dateInputLabel}>To</Text>
                  <Text style={[styles.dateInputValue, !toDate && styles.dateInputPlaceholder]}>
                    {formatDate(toDate)}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {(fromDate || toDate) && (
                <TouchableOpacity 
                  style={styles.clearDatesButton}
                  onPress={() => {
                    setFromDate(null);
                    setToDate(null);
                    setTimeout(() => loadTodaySummary(), 100);
                  }}>
                  <Text style={styles.clearDatesText}>Clear Dates</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Overall Statistics */}
            <View style={styles.overallStatsContainer}>
              <View style={styles.overallStatCard}>
                <Text style={styles.overallStatIcon}>🚗</Text>
                <Text style={styles.overallStatValue}>{summaryData.totalVehicles}</Text>
                <Text style={styles.overallStatLabel}>Total Vehicles</Text>
              </View>

              <View style={styles.overallStatCard}>
                <Text style={styles.overallStatIcon}>💰</Text>
                <Text style={styles.overallStatValue}>₹{summaryData.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                <Text style={styles.overallStatLabel}>Total Revenue</Text>
              </View>

              <View style={styles.overallStatCard}>
                <Text style={styles.overallStatIcon}>📊</Text>
                <Text style={styles.overallStatValue}>₹{summaryData.averageAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                <Text style={styles.overallStatLabel}>Average Amount</Text>
              </View>
            </View>

            {/* Payment Mode Breakdown */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Payment Mode Breakdown</Text>
              <View style={styles.paymentGrid}>
                <View style={[styles.paymentCard, styles.cashCard]}>
                  <Text style={styles.paymentIcon}>💵</Text>
                  <Text style={styles.paymentValue}>₹{summaryData.paymentModeBreakdown.Cash.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                  <Text style={styles.paymentLabel}>Cash</Text>
                </View>

                <View style={[styles.paymentCard, styles.cardCard]}>
                  <Text style={styles.paymentIcon}>💳</Text>
                  <Text style={styles.paymentValue}>₹{summaryData.paymentModeBreakdown.Card.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                  <Text style={styles.paymentLabel}>Card</Text>
                </View>

                <View style={[styles.paymentCard, styles.upiCard]}>
                  <Text style={styles.paymentIcon}>📱</Text>
                  <Text style={styles.paymentValue}>₹{summaryData.paymentModeBreakdown.UPI.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                  <Text style={styles.paymentLabel}>UPI</Text>
                </View>
              </View>
            </View>

            {/* Shifts Section */}
            {summaryData.shifts && summaryData.shifts.length > 0 && (
              <View style={styles.shiftsSection}>
                <Text style={styles.sectionTitle}>Shifts Breakdown</Text>
                {summaryData.shifts.map((shift, index) => (
                  <View key={`shift-${index}`} style={[styles.shiftCard, shift.isActive && styles.shiftCardActive]}>
                    <View style={styles.shiftHeader}>
                      <View style={styles.shiftHeaderLeft}>
                        <Text style={styles.shiftName}>{shift.name}</Text>
                        {shift.isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.shiftStats}>
                      <View style={styles.shiftStatItem}>
                        <Text style={styles.shiftStatIcon}>🚗</Text>
                        <View style={styles.shiftStatContent}>
                          <Text style={styles.shiftStatValue}>{shift.vehicleCount}</Text>
                          <Text style={styles.shiftStatLabel}>Vehicles</Text>
                        </View>
                      </View>

                      <View style={styles.shiftStatItem}>
                        <Text style={styles.shiftStatIcon}>💰</Text>
                        <View style={styles.shiftStatContent}>
                          <Text style={styles.shiftStatValue}>₹{shift.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                          <Text style={styles.shiftStatLabel}>Revenue</Text>
                        </View>
                      </View>
                    </View>

                    {/* Payment Modes for Shift */}
                    {(shift.paymentModes.Cash > 0 || shift.paymentModes.Card > 0 || shift.paymentModes.UPI > 0) && (
                      <View style={styles.shiftPaymentModes}>
                        <Text style={styles.shiftPaymentTitle}>Payment Modes:</Text>
                        <View style={styles.shiftPaymentRow}>
                          {shift.paymentModes.Cash > 0 && (
                            <View style={styles.shiftPaymentItem}>
                              <Text style={styles.shiftPaymentLabel}>Cash:</Text>
                              <Text style={styles.shiftPaymentValue}>₹{shift.paymentModes.Cash.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                            </View>
                          )}
                          {shift.paymentModes.Card > 0 && (
                            <View style={styles.shiftPaymentItem}>
                              <Text style={styles.shiftPaymentLabel}>Card:</Text>
                              <Text style={styles.shiftPaymentValue}>₹{shift.paymentModes.Card.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                            </View>
                          )}
                          {shift.paymentModes.UPI > 0 && (
                            <View style={styles.shiftPaymentItem}>
                              <Text style={styles.shiftPaymentLabel}>UPI:</Text>
                              <Text style={styles.shiftPaymentValue}>₹{shift.paymentModes.UPI.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )
      )}

      {/* Calendar View (iOS and Android fallback) */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(null)}>
          <TouchableOpacity
            style={styles.calendarModal}
            activeOpacity={1}
            onPress={() => setShowDatePicker(null)}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={() => navigateMonth('prev')}
                  style={styles.calendarNavButton}>
                  <Text style={styles.calendarNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.calendarMonthText}>
                  {calendarMonth.toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => navigateMonth('next')}
                  style={styles.calendarNavButton}>
                  <Text style={styles.calendarNavText}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calendarWeekDays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={styles.calendarWeekDay}>
                    <Text style={styles.calendarWeekDayText}>{day}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calendarDays}>
                {getCalendarDays().map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      date && isDateSelected(date) && styles.calendarDaySelected,
                      date && isToday(date) && styles.calendarDayToday,
                      !date && styles.calendarDayEmpty,
                    ]}
                    onPress={() => date && handleDateSelect(date)}
                    disabled={!date}>
                    {date && (
                      <Text
                        style={[
                          styles.calendarDayText,
                          isDateSelected(date) && styles.calendarDayTextSelected,
                          isToday(date) && !isDateSelected(date) && styles.calendarDayTextToday,
                        ]}>
                        {date.getDate()}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.calendarCloseButton}
                onPress={() => setShowDatePicker(null)}>
                <Text style={styles.calendarCloseText}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: getResponsiveSpacing(20),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(12),
    paddingHorizontal: getResponsiveSpacing(12),
    height: moderateScale(48),
  },
  searchIcon: {
    fontSize: getResponsiveFontSize(18),
    marginRight: getResponsiveSpacing(8),
  },
  searchInput: {
    flex: 1,
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: getResponsiveSpacing(4),
  },
  clearButtonText: {
    fontSize: getResponsiveFontSize(18),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchResultText: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: verticalScale(8),
    gap: getResponsiveSpacing(8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  activeTab: {
    backgroundColor: COLORS.gradientEnd,
  },
  tabText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  errorEmoji: {
    fontSize: getResponsiveFontSize(48),
    marginBottom: verticalScale(12),
  },
  errorText: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: verticalScale(16),
  },
  retryButton: {
    backgroundColor: COLORS.gradientEnd,
    paddingHorizontal: getResponsiveSpacing(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  emptyEmoji: {
    fontSize: getResponsiveFontSize(64),
    marginBottom: verticalScale(16),
  },
  emptyText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(8),
  },
  emptySubtext: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    padding: getResponsiveSpacing(20),
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(16),
    marginBottom: verticalScale(12),
    ...SHADOWS.medium,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  vehicleNumber: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tagNumber: {
    fontSize: getResponsiveFontSize(13),
    fontWeight: '600',
    color: COLORS.gradientEnd,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: verticalScale(12),
  },
  jobDetails: {
    marginBottom: verticalScale(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(6),
  },
  detailLabel: {
    fontSize: getResponsiveFontSize(13),
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: getResponsiveFontSize(13),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  durationValue: {
    fontSize: getResponsiveFontSize(13),
    fontWeight: '700',
    color: COLORS.gradientEnd,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    gap: getResponsiveSpacing(8),
  },
  printButtonDisabled: {
    opacity: 0.6,
  },
  printIcon: {
    fontSize: getResponsiveFontSize(18),
  },
  printButtonText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#EF4444',
  },
  summaryContainer: {
    flex: 1,
  },
  summaryContent: {
    padding: getResponsiveSpacing(20),
  },
  summaryHeader: {
    marginBottom: verticalScale(20),
  },
  summaryTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(4),
  },
  summaryDate: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(12),
    marginBottom: verticalScale(24),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(20),
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  statIcon: {
    fontSize: getResponsiveFontSize(32),
    marginBottom: verticalScale(8),
  },
  statValue: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  receiptsSection: {
    marginTop: verticalScale(8),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(12),
  },
  receiptCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(16),
    marginBottom: verticalScale(12),
    ...SHADOWS.small,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  receiptVehicle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  receiptTime: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
  },
  receiptDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: verticalScale(12),
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(6),
  },
  receiptLabel: {
    fontSize: getResponsiveFontSize(13),
    color: COLORS.textSecondary,
  },
  receiptAmount: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  receiptSettlement: {
    color: COLORS.gradientEnd,
  },
  // New Summary Styles
  overallStatsContainer: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(12),
    marginBottom: verticalScale(24),
  },
  overallStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(16),
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  overallStatIcon: {
    fontSize: getResponsiveFontSize(28),
    marginBottom: verticalScale(8),
  },
  overallStatValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(4),
    textAlign: 'center',
  },
  overallStatLabel: {
    fontSize: getResponsiveFontSize(11),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  paymentSection: {
    marginBottom: verticalScale(24),
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(12),
  },
  paymentCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(16),
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  cashCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  upiCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  paymentIcon: {
    fontSize: getResponsiveFontSize(28),
    marginBottom: verticalScale(8),
  },
  paymentValue: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(4),
    textAlign: 'center',
  },
  paymentLabel: {
    fontSize: getResponsiveFontSize(11),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  shiftsSection: {
    marginBottom: verticalScale(24),
  },
  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(20),
    marginBottom: verticalScale(16),
    ...SHADOWS.medium,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shiftCardActive: {
    borderColor: COLORS.gradientEnd,
    backgroundColor: '#F0F9FF',
  },
  shiftHeader: {
    marginBottom: verticalScale(16),
  },
  shiftHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(12),
  },
  shiftName: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  activeBadge: {
    backgroundColor: COLORS.gradientEnd,
    paddingHorizontal: getResponsiveSpacing(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  activeBadgeText: {
    fontSize: getResponsiveFontSize(10),
    fontWeight: '600',
    color: COLORS.white,
  },
  shiftStats: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(16),
    marginBottom: verticalScale(12),
  },
  shiftStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(12),
    gap: getResponsiveSpacing(8),
  },
  shiftStatIcon: {
    fontSize: getResponsiveFontSize(20),
  },
  shiftStatContent: {
    flex: 1,
  },
  shiftStatValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(2),
  },
  shiftStatLabel: {
    fontSize: getResponsiveFontSize(11),
    color: COLORS.textSecondary,
  },
  shiftPaymentModes: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  shiftPaymentTitle: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: verticalScale(8),
  },
  shiftPaymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSpacing(12),
  },
  shiftPaymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(4),
  },
  shiftPaymentLabel: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
  },
  shiftPaymentValue: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Date Filter Styles
  dateFilterContainer: {
    marginBottom: verticalScale(24),
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(12),
    marginBottom: verticalScale(12),
  },
  dateInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: verticalScale(8),
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  dateInputSelected: {
    borderColor: COLORS.gradientEnd,
    backgroundColor: '#F0F9FF',
  },
  dateInputLabel: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: verticalScale(4),
  },
  dateInputValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dateInputPlaceholder: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  clearDatesButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
    backgroundColor: COLORS.backgroundLight,
  },
  clearDatesText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.gradientEnd,
  },
  // Calendar View Styles
  calendarModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  calendarContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20),
    padding: getResponsiveSpacing(20),
    width: '100%',
    maxWidth: moderateScale(400),
    ...SHADOWS.large,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  calendarNavButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavText: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700',
    color: COLORS.gradientEnd,
  },
  calendarMonthText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: verticalScale(8),
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: verticalScale(8),
  },
  calendarWeekDayText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: verticalScale(16),
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(8),
    marginBottom: verticalScale(4),
  },
  calendarDayEmpty: {
    // Empty cells don't need styling
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: COLORS.gradientEnd,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.gradientEnd,
  },
  calendarDayText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  calendarDayTextToday: {
    color: COLORS.gradientEnd,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  calendarCloseButton: {
    marginTop: verticalScale(8),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
  },
  calendarCloseText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
