import { render } from 'preact';
import { readBootState, type SidebarState } from '../types';
import { EMPTY_SIDEBAR_STATE, SidebarApp } from './SidebarApp';

const initialState =
    readBootState<{ kind: 'sidebar'; state: SidebarState }>('sidebar') ?? EMPTY_SIDEBAR_STATE;

const root = document.getElementById('root');

if (root) {
    render(<SidebarApp initialState={initialState} />, root);
}
