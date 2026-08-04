import axios from 'axios';

const api = axios.create({
  baseURL: `http://${window.location.hostname}:8085/api`, // 백엔드 주소
  withCredentials: true // 쿠키(세션 ID)를 포함해서 보내도록 설정
});

export default api;