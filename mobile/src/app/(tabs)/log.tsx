import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { EntryEditor } from '@/components/EntryEditor';
import { Screen } from '@/components/Screen';
import { Button, Display, Eyebrow, Hero, Icon, Row, Sheet, Txt } from '@/components/ui';
import { fmtDateLong } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function LogScreen() {
  const t = useTokens();
  const s = useAppStore();
  const today = new Date();

  return (
    <Screen>
      <Hero gap={10}>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">Log today</Eyebrow>
          <Pressable
            onPress={() => router.push('/diary')}
            accessibilityRole="button"
            accessibilityLabel="Diary"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, backgroundColor: t.colors.btn2, borderWidth: 1, borderColor: t.colors.btn2Border }}>
            <Icon name="calendar" size={16} color="heroFg" />
            <Txt size={13} weight={700} color="heroFg">
              Diary
            </Txt>
          </Pressable>
        </Row>
        <Display size={36} color="heroFg">
          {fmtDateLong(today)}
        </Display>
        <Txt size={14} color="heroMuted">
          {s.activeVessel ? `${s.activeVessel.name} · ${s.active?.position}` : 'No current yacht'}
        </Txt>
      </Hero>

      <Sheet gap={16} paddingTop={24} paddingBottom={32}>
        {s.active ? (
          <EntryEditor
            // Remount when the day's entry changes (saved elsewhere, or a new day).
            key={`${s.active.id}-${s.today}-${s.loggedToday?.updatedAt ?? 'new'}`}
            engagementId={s.active.id}
            date={s.today}
            position={s.active.position}
            existing={s.loggedToday}
            onSaved={(confirmed) => {
              if (confirmed) {
                router.navigate('/');
                s.flash(`Logged · ${fmtDateLong(today)}`);
              } else s.flash('Saved as draft');
            }}
          />
        ) : (
          <>
            <Txt size={15}>Add the yacht you are on to start logging days.</Txt>
            <Button label="Add current yacht" icon="plus" onPress={() => router.push('/vessels')} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
