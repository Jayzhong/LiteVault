'use client';

import { microcopy } from '@/lib/microcopy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/lib/store/AppContext';

export function PreferencesCard() {
    const { aiSuggestionsEnabled, setAiSuggestionsEnabled } = useAppContext();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{microcopy.settings.section.preferences}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Language (placeholder) */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                        {microcopy.settings.preferences.defaultLanguage}
                    </span>
                    <span className="text-sm text-muted-foreground">English (US)</span>
                </div>

                {/* Timezone (placeholder) */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                        {microcopy.settings.preferences.timezone}
                    </span>
                    <span className="text-sm text-muted-foreground">UTC+8</span>
                </div>

                {/* AI Toggle */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-0.5">
                        <label
                            htmlFor="ai-toggle"
                            className="text-sm font-medium text-foreground"
                        >
                            {microcopy.settings.preferences.aiToggle.title}
                        </label>
                        <p className="text-xs text-muted-foreground">
                            {microcopy.settings.preferences.aiToggle.help}
                        </p>
                    </div>
                    <Switch
                        id="ai-toggle"
                        checked={aiSuggestionsEnabled}
                        onCheckedChange={setAiSuggestionsEnabled}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
