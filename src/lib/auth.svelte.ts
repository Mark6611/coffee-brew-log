import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Module-level reactive state for the current user.
// Components can read `auth.user` and it will react to sign-in / sign-out.
let userState = $state<User | null>(null);
let ready = $state(false);

export const auth = {
	get user() {
		return userState;
	},
	get ready() {
		return ready;
	}
};

if (typeof window !== 'undefined') {
	supabase.auth.getSession().then(({ data }) => {
		userState = data.session?.user ?? null;
		ready = true;
	});

	supabase.auth.onAuthStateChange((_event, session) => {
		userState = session?.user ?? null;
	});
}

export async function signOut() {
	await supabase.auth.signOut();
}
