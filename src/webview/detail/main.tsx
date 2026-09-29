import { render } from 'preact';
import { readBootState, type DetailState } from '../types';
import { DetailApp } from './DetailApp';

const initialState = readBootState<{ kind: 'detail'; state: DetailState }>('detail');

const root = document.getElementById('root');

if (root && initialState) {
    render(<DetailApp initialState={initialState} />, root);
}
