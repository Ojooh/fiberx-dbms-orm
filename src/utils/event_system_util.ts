type EventListener<T = any> = (data: T, options?: Record<string, any>) => void;

class EventSystemUtil {
    private static events: Record<string, EventListener[]> = {};

    /** Register an event listener */
    public static on<T = any>(event: string, listener: EventListener<T>): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    /** Emit an event and trigger all listeners */
    public static emit<T = any>(event: string, data: T, options?: Record<string, any>): void {
        if (this.events[event]) {
            for (const listener of this.events[event]) {
                listener(data, options);
            }
        }
    }

    /** Remove a specific listener */
    public static off<T = any>(event: string, listener: EventListener<T>): void {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
    }

    /** Clear all listeners for an event (optional utility) */
    public static clear(event: string): void {
        delete this.events[event];
    }
}

export default EventSystemUtil;
